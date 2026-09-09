import { buildApp } from '../src/app.js';
import { MemoryMvpStore } from '../src/memory-mvp-store.js';

const buildTestApp = () =>
  buildApp({
    sessionConfiguration: {
      cookieName: 'sem-caderno-session',
      hmacKey: new Uint8Array(32).fill(7),
    },
    sessionResolution: { resolve: () => Promise.resolve(undefined) },
    mvpStore: new MemoryMvpStore(),
    webOrigin: 'http://127.0.0.1:3000',
    secureCookies: false,
  });

describe('MVP HTTP routes', () => {
  let app = buildTestApp();

  beforeEach(() => {
    app = buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const authenticate = async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mvp/sign-in',
      payload: { email: 'demo@semcaderno.app', password: 'semcaderno' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { csrfToken: string } }>();
    const setCookies = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie'] ?? ''];
    const cookies = setCookies.map((cookie) => cookie.split(';')[0]).join('; ');
    return { cookies, csrf: body.data.csrfToken };
  };

  it('exposes a health check and rejects anonymous business data access', async () => {
    expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/mvp/snapshot' })).statusCode).toBe(401);
  });

  it('signs in, resolves the business from the cookie, and returns the snapshot', async () => {
    const authentication = await authenticate();
    const response = await app.inject({
      url: '/api/mvp/snapshot',
      headers: { cookie: authentication.cookies },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        business: { name: 'Mercearia Boa Vizinhança', demo: true },
        user: { email: 'demo@semcaderno.app' },
      },
    });
  });

  it('requires matching CSRF evidence for a mutation', async () => {
    const authentication = await authenticate();
    const withoutCsrf = await app.inject({
      method: 'POST',
      url: '/api/mvp/customers',
      headers: { cookie: authentication.cookies, 'idempotency-key': 'customer_http_001' },
      payload: { name: 'Cliente HTTP' },
    });
    expect(withoutCsrf.statusCode).toBe(403);

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/mvp/customers',
      headers: {
        cookie: authentication.cookies,
        'x-sem-caderno-csrf': authentication.csrf,
        'idempotency-key': 'customer_http_001',
      },
      payload: { name: 'Cliente HTTP' },
    });
    expect(accepted.statusCode).toBe(201);
  });

  it('replays the same HTTP operation without creating a duplicate', async () => {
    const authentication = await authenticate();
    const options = {
      method: 'POST' as const,
      url: '/api/mvp/expenses',
      headers: {
        cookie: authentication.cookies,
        'x-sem-caderno-csrf': authentication.csrf,
        'idempotency-key': 'expense_http_001',
      },
      payload: { description: 'Gás', amountCents: 12000, occurredOn: '2026-09-09' },
    };
    const first = await app.inject(options);
    const replay = await app.inject(options);

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toEqual(first.json());
  });

  it('creates and edits catalog records and prices a sale from the stored product', async () => {
    const authentication = await authenticate();
    let sequence = 0;
    const mutation = async (
      method: 'POST' | 'PUT',
      url: string,
      payload: Record<string, unknown>,
    ) =>
      await app.inject({
        method,
        url,
        headers: {
          cookie: authentication.cookies,
          'x-sem-caderno-csrf': authentication.csrf,
          'idempotency-key': `catalog_http_${++sequence}`,
        },
        payload,
      });

    const productResponse = await mutation('POST', '/api/mvp/products', {
      name: 'Suco regional',
      priceCents: 750,
      stockQuantity: 5,
    });
    expect(productResponse.statusCode).toBe(201);
    const product = productResponse.json<{ data: { id: string } }>().data;
    const updated = await mutation('PUT', `/api/mvp/products/${product.id}`, {
      name: 'Suco regional 500 ml',
      priceCents: 800,
      stockQuantity: 6,
    });
    expect(updated.statusCode).toBe(200);

    const customerResponse = await mutation('POST', '/api/mvp/customers', {
      name: 'Cliente HTTP',
      phone: '(92) 98165-9847',
    });
    const customer = customerResponse.json<{ data: { id: string } }>().data;
    const editedCustomer = await mutation('PUT', `/api/mvp/customers/${customer.id}`, {
      name: 'Cliente HTTP editado',
      phone: '(92) 98165-9847',
      note: 'Retira no balcão',
    });
    expect(editedCustomer.statusCode).toBe(200);

    const sale = await mutation('POST', '/api/mvp/sales', {
      amountPaidCents: 1_600,
      paymentMethod: 'pix',
      items: [{ productId: product.id, quantity: 2 }],
    });
    expect(sale.statusCode).toBe(201);
    expect(sale.json()).toMatchObject({ data: { totalCents: 1_600, status: 'paid' } });

    const snapshot = await app.inject({
      url: '/api/mvp/snapshot',
      headers: { cookie: authentication.cookies },
    });
    const snapshotBody = snapshot.json<{
      data: { products: { id: string; stockQuantity: number }[] };
    }>();
    expect(snapshotBody.data.products.find((item) => item.id === product.id)).toMatchObject({
      stockQuantity: 4,
    });
  });

  it('requires CSRF evidence to sign out and revokes the authenticated session', async () => {
    const authentication = await authenticate();
    const withoutCsrf = await app.inject({
      method: 'POST',
      url: '/api/mvp/sign-out',
      headers: { cookie: authentication.cookies },
    });
    expect(withoutCsrf.statusCode).toBe(403);

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/mvp/sign-out',
      headers: {
        cookie: authentication.cookies,
        'x-sem-caderno-csrf': authentication.csrf,
      },
    });
    expect(accepted.statusCode).toBe(204);

    const afterSignOut = await app.inject({
      url: '/api/mvp/snapshot',
      headers: { cookie: authentication.cookies },
    });
    expect(afterSignOut.statusCode).toBe(401);
  });
});

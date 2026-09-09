import { createHash, timingSafeEqual } from 'node:crypto';

import {
  MvpConflictError,
  MvpNotFoundError,
  MvpValidationError,
  type MvpStore,
  type Payment,
  type PublicSession,
  type SaleDraft,
} from '@sem-caderno/application';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const sessionCookie = 'sem-caderno-mvp';
const csrfCookie = 'sem-caderno-csrf';

type UnknownRecord = Record<string, unknown>;
const objectBody = (request: FastifyRequest): UnknownRecord => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body))
    throw new MvpValidationError('Não foi possível ler os dados enviados.');
  return request.body as UnknownRecord;
};
const text = (body: UnknownRecord, key: string) => (typeof body[key] === 'string' ? body[key] : '');
const optionalText = (body: UnknownRecord, key: string) =>
  typeof body[key] === 'string' && body[key] ? body[key] : undefined;
const integer = (body: UnknownRecord, key: string) =>
  typeof body[key] === 'number' && Number.isSafeInteger(body[key]) ? body[key] : Number.NaN;

const problem = (reply: FastifyReply, status: number, message: string) =>
  reply
    .code(status)
    .type('application/problem+json')
    .send({
      type: 'about:blank',
      title: status === 401 ? 'Sessão necessária' : 'Não foi possível concluir',
      status,
      detail: message,
    });

const handleError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof MvpValidationError) return problem(reply, 422, error.message);
  if (error instanceof MvpConflictError) return problem(reply, 409, error.message);
  if (error instanceof MvpNotFoundError) return problem(reply, 404, error.message);
  return problem(reply, 500, 'Algo deu errado. Tente novamente em alguns instantes.');
};

const cookieOptions = (secure: boolean) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure,
  maxAge: 12 * 60 * 60,
});
const publishSession = (reply: FastifyReply, session: PublicSession, secure: boolean) => {
  reply.setCookie(sessionCookie, session.token, cookieOptions(secure));
  reply.setCookie(csrfCookie, session.csrfToken, { ...cookieOptions(secure), httpOnly: false });
};
const publicSession = (session: PublicSession) => ({
  user: { id: session.userId, name: session.userName, email: session.email },
  business: { id: session.businessId, name: session.businessName, demo: session.demo },
  csrfToken: session.csrfToken,
});

export const registerMvpRoutes = (
  app: FastifyInstance,
  store: MvpStore,
  options: Readonly<{ secureCookies: boolean }>,
) => {
  const signInAttempts = new Map<string, { failures: number; windowEndsAt: number }>();
  const authenticate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<PublicSession | undefined> => {
    const token = request.cookies[sessionCookie];
    if (!token) {
      problem(reply, 401, 'Entre novamente para continuar.');
      return undefined;
    }
    const session = await store.session(token);
    if (!session) {
      problem(reply, 401, 'Sua sessão terminou. Entre novamente para continuar.');
      return undefined;
    }
    return session;
  };
  const authorizeMutation = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<PublicSession | undefined> => {
    const session = await authenticate(request, reply);
    if (!session) return undefined;
    const header = request.headers['x-sem-caderno-csrf'];
    const cookie = request.cookies[csrfCookie];
    if (typeof header !== 'string' || typeof cookie !== 'string') {
      problem(reply, 403, 'Atualize a página antes de tentar novamente.');
      return undefined;
    }
    const expected = Buffer.from(session.csrfToken);
    const received = Buffer.from(header);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received) ||
      cookie !== header
    ) {
      problem(reply, 403, 'Atualize a página antes de tentar novamente.');
      return undefined;
    }
    return session;
  };
  const key = (request: FastifyRequest) =>
    typeof request.headers['idempotency-key'] === 'string'
      ? request.headers['idempotency-key']
      : '';

  app.get('/health', () => ({ status: 'ok' }));
  app.post('/api/mvp/register', async (request, reply) => {
    try {
      const body = objectBody(request);
      const session = await store.register({
        name: text(body, 'name'),
        email: text(body, 'email'),
        password: text(body, 'password'),
        businessName: text(body, 'businessName'),
      });
      publishSession(reply, session, options.secureCookies);
      return reply.code(201).send({ data: publicSession(session) });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/sign-in', async (request, reply) => {
    try {
      const body = objectBody(request);
      const attemptKey = createHash('sha256')
        .update(`${request.ip}:${text(body, 'email').trim().toLowerCase()}`, 'utf8')
        .digest('base64url');
      const attempt = signInAttempts.get(attemptKey);
      const currentTime = Date.now();
      if (signInAttempts.size > 5_000) {
        for (const [storedKey, stored] of signInAttempts) {
          if (stored.windowEndsAt <= currentTime) signInAttempts.delete(storedKey);
        }
        while (signInAttempts.size > 5_000) {
          const oldestKey = signInAttempts.keys().next().value;
          if (!oldestKey) break;
          signInAttempts.delete(oldestKey);
        }
      }
      if (attempt && attempt.windowEndsAt > currentTime && attempt.failures >= 10) {
        return reply
          .code(429)
          .header('Retry-After', Math.ceil((attempt.windowEndsAt - currentTime) / 1_000))
          .type('application/problem+json')
          .send({
            type: 'about:blank',
            title: 'Muitas tentativas',
            status: 429,
            detail: 'Aguarde alguns minutos antes de tentar entrar novamente.',
          });
      }
      const session = await store.signIn({
        email: text(body, 'email'),
        password: text(body, 'password'),
      });
      if (!session) {
        const activeAttempt = attempt && attempt.windowEndsAt > currentTime ? attempt : undefined;
        signInAttempts.set(attemptKey, {
          failures: (activeAttempt?.failures ?? 0) + 1,
          windowEndsAt: activeAttempt?.windowEndsAt ?? currentTime + 15 * 60 * 1_000,
        });
        return problem(reply, 401, 'E-mail ou senha não conferem.');
      }
      signInAttempts.delete(attemptKey);
      publishSession(reply, session, options.secureCookies);
      return reply.send({ data: publicSession(session) });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/sign-out', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    await store.signOut(session.token);
    reply.clearCookie(sessionCookie, { path: '/' }).clearCookie(csrfCookie, { path: '/' });
    return reply.code(204).send();
  });
  app.get('/api/mvp/session', async (request, reply) => {
    const session = await authenticate(request, reply);
    if (!session) return;
    return { data: publicSession(session) };
  });
  app.get('/api/mvp/snapshot', async (request, reply) => {
    const session = await authenticate(request, reply);
    if (!session) return;
    try {
      return { data: await store.snapshot(session) };
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/customers', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const phone = optionalText(body, 'phone');
      const note = optionalText(body, 'note');
      return reply.code(201).send({
        data: await store.createCustomer(
          session,
          {
            name: text(body, 'name'),
            ...(phone ? { phone } : {}),
            ...(note ? { note } : {}),
          },
          key(request),
        ),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.put('/api/mvp/customers/:customerId', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const params = request.params as { customerId?: string };
      const phone = optionalText(body, 'phone');
      const note = optionalText(body, 'note');
      return {
        data: await store.updateCustomer(
          session,
          params.customerId ?? '',
          {
            name: text(body, 'name'),
            ...(phone ? { phone } : {}),
            ...(note ? { note } : {}),
          },
          key(request),
        ),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/products', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      return reply.code(201).send({
        data: await store.createProduct(
          session,
          {
            name: text(body, 'name'),
            priceCents: integer(body, 'priceCents'),
            stockQuantity: integer(body, 'stockQuantity'),
          },
          key(request),
        ),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.put('/api/mvp/products/:productId', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const params = request.params as { productId?: string };
      return {
        data: await store.updateProduct(
          session,
          params.productId ?? '',
          {
            name: text(body, 'name'),
            priceCents: integer(body, 'priceCents'),
            stockQuantity: integer(body, 'stockQuantity'),
          },
          key(request),
        ),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/sales', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      if (!Array.isArray(body['items']))
        throw new MvpValidationError('Adicione pelo menos um item à venda.');
      const items = body['items'].map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          throw new MvpValidationError('Revise os itens da venda.');
        const value = item as UnknownRecord;
        return {
          productId: text(value, 'productId'),
          quantity: integer(value, 'quantity'),
        };
      });
      const method = text(body, 'paymentMethod') as Payment['method'];
      if (!['cash', 'pix', 'card', 'other'].includes(method))
        throw new MvpValidationError('Escolha como o valor foi recebido.');
      const customerId = optionalText(body, 'customerId');
      const draft: SaleDraft = {
        ...(customerId ? { customerId } : {}),
        amountPaidCents: integer(body, 'amountPaidCents'),
        paymentMethod: method,
        items,
      };
      return reply.code(201).send({ data: await store.createSale(session, draft, key(request)) });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/payments', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const method = text(body, 'method') as Payment['method'];
      if (!['cash', 'pix', 'card', 'other'].includes(method))
        throw new MvpValidationError('Escolha como o valor foi recebido.');
      return reply.code(201).send({
        data: await store.recordPayment(
          session,
          { saleId: text(body, 'saleId'), amountCents: integer(body, 'amountCents'), method },
          key(request),
        ),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/expenses', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      return reply.code(201).send({
        data: await store.createExpense(
          session,
          {
            description: text(body, 'description'),
            amountCents: integer(body, 'amountCents'),
            occurredOn: text(body, 'occurredOn'),
          },
          key(request),
        ),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.put('/api/mvp/settings', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const pixKey = optionalText(body, 'pixKey');
      await store.updateSettings(session, {
        businessName: text(body, 'businessName'),
        ...(pixKey ? { pixKey } : {}),
      });
      return reply.code(204).send();
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.put('/api/mvp/settings/whatsapp', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const accessToken = optionalText(body, 'accessToken');
      return {
        data: await store.updateWhatsAppIntegration(session, {
          wabaId: text(body, 'wabaId'),
          phoneNumberId: text(body, 'phoneNumberId'),
          ...(accessToken ? { accessToken } : {}),
          templateName: text(body, 'templateName'),
          enabled: body['enabled'] === true,
        }),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/sales/:saleId/cancel', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      const params = request.params as { saleId?: string };
      return {
        data: await store.cancelSale(
          session,
          { saleId: params.saleId ?? '', reason: text(body, 'reason') },
          key(request),
        ),
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
  app.post('/api/mvp/collections', async (request, reply) => {
    const session = await authorizeMutation(request, reply);
    if (!session) return;
    try {
      const body = objectBody(request);
      return reply.code(201).send({
        data: await store.createCollection(
          session,
          { customerId: text(body, 'customerId'), amountCents: integer(body, 'amountCents') },
          key(request),
        ),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

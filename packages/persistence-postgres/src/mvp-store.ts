import { createHash, randomBytes } from 'node:crypto';

import { hash, verify } from 'argon2';
import type { Pool, PoolClient } from 'pg';

import {
  FinancialRuleError,
  MvpConflictError,
  MvpNotFoundError,
  MvpValidationError,
  applyPayment as applyFinancialPayment,
  assertStockAvailable,
  previewSale,
  type Activity,
  type BusinessSnapshot,
  type Customer,
  type Expense,
  type MvpStore,
  type Payment,
  type Product,
  type PublicSession,
  type Sale,
  type SaleDraft,
  type SaleItem,
} from '@sem-caderno/application';

type Row = Record<string, unknown>;
const now = () => new Date();
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const stringValue = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== 'string') throw new Error('PostgreSQL returned an invalid row.');
  return value;
};
const optionalString = (row: Row, key: string): string | undefined => {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('PostgreSQL returned an invalid row.');
  return value;
};
const integerValue = (row: Row, key: string): number => {
  const value = row[key];
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed))
    throw new Error('PostgreSQL returned an invalid financial value.');
  return parsed;
};
const booleanValue = (row: Row, key: string): boolean => {
  const value = row[key];
  if (typeof value !== 'boolean') throw new Error('PostgreSQL returned an invalid row.');
  return value;
};
const hasConstraint = (error: unknown, constraint: string) =>
  typeof error === 'object' &&
  error !== null &&
  'constraint' in error &&
  error.constraint === constraint;
const isoValue = (row: Row, key: string): string => {
  const value = row[key];
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error('PostgreSQL returned an invalid instant.');
  return value.toISOString();
};
const assertText = (value: string, label: string, maximum = 120) => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 1 || normalized.length > maximum)
    throw new MvpValidationError(`${label} não está preenchido corretamente.`);
  return normalized;
};
const assertCents = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new MvpValidationError(`${label} deve ser maior que zero.`);
  return value;
};
const translateFinancialRule = (error: unknown): never => {
  if (!(error instanceof FinancialRuleError)) throw error;
  const messages: Record<FinancialRuleError['code'], string> = {
    INVALID_MONEY: 'Revise os valores informados.',
    EMPTY_SALE: 'Adicione pelo menos um item à venda.',
    INVALID_QUANTITY: 'A quantidade do item não é válida.',
    PAYMENT_EXCEEDS_TOTAL: 'O valor recebido deve estar entre zero e o total da venda.',
    CUSTOMER_REQUIRED: 'Escolha um cliente para deixar valor em aberto.',
    OVERPAYMENT: 'O valor recebido não pode ser maior que o valor em aberto.',
    INSUFFICIENT_STOCK: 'A quantidade vendida é maior que o estoque disponível.',
  };
  throw new MvpValidationError(messages[error.code]);
};
const applyFinancialRule = <Result>(operation: () => Result): Result => {
  try {
    return operation();
  } catch (error) {
    return translateFinancialRule(error);
  }
};
const normalizedPhone = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined;
  const digits = value.replace(/\D/g, '');
  const international = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(international))
    throw new MvpValidationError('Informe um WhatsApp brasileiro com DDD.');
  return international;
};
const assertStock = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 9_999_999)
    throw new MvpValidationError('Informe uma quantidade de estoque válida.');
  return value;
};
const issueEvidence = () => ({
  token: randomBytes(32).toString('base64url'),
  csrfToken: randomBytes(24).toString('base64url'),
});
const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value), 'utf8').digest('base64url');
const dummyPasswordVerifier =
  '$argon2id$v=19$m=19456,p=1,t=2$c2VtLWNhZGVybm8tdjEhIQ$r2Troww4JLUnNo/ejnOJQAKcLSv3IGQ6X7FpAuC6Rrk';

const mapCustomer = (row: Row): Customer => ({
  id: stringValue(row, 'id'),
  name: stringValue(row, 'name'),
  ...(optionalString(row, 'phone') ? { phone: optionalString(row, 'phone')! } : {}),
  ...(optionalString(row, 'note') ? { note: optionalString(row, 'note')! } : {}),
  active: booleanValue(row, 'active'),
  createdAt: isoValue(row, 'createdAt'),
});
const mapProduct = (row: Row): Product => ({
  id: stringValue(row, 'id'),
  name: stringValue(row, 'name'),
  priceCents: integerValue(row, 'priceCents'),
  stockQuantity: integerValue(row, 'stockQuantity'),
  active: booleanValue(row, 'active'),
  createdAt: isoValue(row, 'createdAt'),
});
const mapPayment = (row: Row): Payment => ({
  id: stringValue(row, 'id'),
  saleId: stringValue(row, 'saleId'),
  amountCents: integerValue(row, 'amountCents'),
  method: stringValue(row, 'method') as Payment['method'],
  ...(optionalString(row, 'reversalReason')
    ? {
        reversalReason: optionalString(row, 'reversalReason')!,
        reversedAt: isoValue(row, 'reversedAt'),
      }
    : {}),
  createdAt: isoValue(row, 'createdAt'),
});
const mapExpense = (row: Row): Expense => ({
  id: stringValue(row, 'id'),
  description: stringValue(row, 'description'),
  amountCents: integerValue(row, 'amountCents'),
  occurredOn: stringValue(row, 'occurredOn'),
  createdAt: isoValue(row, 'createdAt'),
});
const mapActivity = (row: Row): Activity => ({
  id: stringValue(row, 'id'),
  kind: stringValue(row, 'kind') as Activity['kind'],
  title: stringValue(row, 'title'),
  detail: stringValue(row, 'detail'),
  ...(row['amountCents'] === null ? {} : { amountCents: integerValue(row, 'amountCents') }),
  createdAt: isoValue(row, 'createdAt'),
});

export class PostgresMvpStore implements MvpStore {
  constructor(private readonly pool: Pool) {}

  async register(
    input: Readonly<{ name: string; email: string; password: string; businessName: string }>,
  ): Promise<PublicSession> {
    const name = assertText(input.name, 'Seu nome');
    const businessName = assertText(input.businessName, 'Nome do estabelecimento');
    const email = normalizeEmail(input.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new MvpValidationError('Informe um e-mail válido.');
    const passwordLength = Array.from(input.password).length;
    if (passwordLength < 8 || passwordLength > 128)
      throw new MvpValidationError('A senha deve ter entre 8 e 128 caracteres.');
    const passwordVerifier = await hash(input.password.normalize('NFC'), {
      type: 2,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const evidence = issueEvidence();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const instant = now();
      const userResult = await client.query<Row>(
        `INSERT INTO sem_caderno.users (email_original,email_normalized,email_verified_at,created_at,updated_at,version,display_name) VALUES ($1,$2,$3,$3,$3,1,$4) RETURNING id`,
        [input.email.trim(), email, instant, name],
      );
      const userId = stringValue(userResult.rows[0]!, 'id');
      await client.query(
        `INSERT INTO sem_caderno.user_password_credentials (user_id,password_verifier,created_at,updated_at,version) VALUES ($1,$2,$3,$3,1)`,
        [userId, passwordVerifier, instant],
      );
      const businessResult = await client.query<Row>(
        `INSERT INTO sem_caderno.businesses (state,created_by_user_id,created_at,updated_at,version,display_name,time_zone) VALUES ('active',$1,$2,$2,1,$3,'America/Manaus') RETURNING id`,
        [userId, instant, businessName],
      );
      const businessId = stringValue(businessResult.rows[0]!, 'id');
      await client.query(
        `INSERT INTO sem_caderno.business_memberships (business_id,user_id,role,state,created_at) VALUES ($1,$2,'owner','active',$3)`,
        [businessId, userId, instant],
      );
      await this.insertSession(client, evidence, userId, businessId, instant);
      await client.query('COMMIT');
      return { ...evidence, userId, businessId, userName: name, email, businessName, demo: false };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (
        typeof error === 'object' &&
        error &&
        'constraint' in error &&
        error.constraint === 'users_email_normalized_unique'
      )
        throw new MvpConflictError('Já existe uma conta com este e-mail.');
      throw error;
    } finally {
      client.release();
    }
  }

  async signIn(
    input: Readonly<{ email: string; password: string }>,
  ): Promise<PublicSession | undefined> {
    const result = await this.pool.query<Row>(
      `SELECT u.id AS "userId",u.display_name AS "userName",u.email_normalized AS email,c.password_verifier AS "passwordVerifier",b.id AS "businessId",b.display_name AS "businessName" FROM sem_caderno.users u JOIN sem_caderno.user_password_credentials c ON c.user_id=u.id JOIN sem_caderno.business_memberships m ON m.user_id=u.id AND m.state='active' JOIN sem_caderno.businesses b ON b.id=m.business_id AND b.state='active' WHERE u.email_normalized=$1 AND u.disabled_at IS NULL ORDER BY m.created_at LIMIT 1`,
      [normalizeEmail(input.email)],
    );
    const row = result.rows[0];
    if (Array.from(input.password).length > 128) return undefined;
    const matches = await verify(
      row ? stringValue(row, 'passwordVerifier') : dummyPasswordVerifier,
      input.password.normalize('NFC'),
    );
    if (!row || !matches) return undefined;
    const evidence = issueEvidence();
    const instant = now();
    const userId = stringValue(row, 'userId');
    const businessId = stringValue(row, 'businessId');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.insertSession(client, evidence, userId, businessId, instant);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    return {
      ...evidence,
      userId,
      businessId,
      userName: stringValue(row, 'userName'),
      email: stringValue(row, 'email'),
      businessName: stringValue(row, 'businessName'),
      demo: false,
    };
  }

  async signOut(token: string): Promise<void> {
    await this.pool.query(
      `UPDATE sem_caderno.mvp_sessions SET revoked_at=now() WHERE token_digest=$1 AND revoked_at IS NULL`,
      [digest(token)],
    );
  }

  async session(token: string): Promise<PublicSession | undefined> {
    const result = await this.pool.query<Row>(
      `SELECT s.user_id AS "userId",s.business_id AS "businessId",s.csrf_digest AS "csrfDigest",u.display_name AS "userName",u.email_normalized AS email,b.display_name AS "businessName" FROM sem_caderno.mvp_sessions s JOIN sem_caderno.users u ON u.id=s.user_id AND u.disabled_at IS NULL JOIN sem_caderno.businesses b ON b.id=s.business_id AND b.state='active' JOIN sem_caderno.business_memberships m ON m.user_id=s.user_id AND m.business_id=s.business_id AND m.state='active' WHERE s.token_digest=$1 AND s.revoked_at IS NULL AND s.expires_at>now() LIMIT 1`,
      [digest(token)],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const csrfDigest = row['csrfDigest'];
    if (!Buffer.isBuffer(csrfDigest)) throw new Error('Session row is invalid.');
    return {
      token,
      csrfToken: csrfDigest.toString('utf8'),
      userId: stringValue(row, 'userId'),
      businessId: stringValue(row, 'businessId'),
      userName: stringValue(row, 'userName'),
      email: stringValue(row, 'email'),
      businessName: stringValue(row, 'businessName'),
      demo: false,
    };
  }

  async snapshot(session: PublicSession): Promise<BusinessSnapshot> {
    const [business, customers, products, sales, items, payments, expenses, activities] =
      await Promise.all([
        this.pool.query<Row>(
          `SELECT display_name AS name,pix_key AS "pixKey" FROM sem_caderno.businesses WHERE id=$1 AND state='active'`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,display_name AS name,phone,note,active,created_at AS "createdAt" FROM sem_caderno.customers WHERE business_id=$1 ORDER BY active DESC,display_name`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,display_name AS name,price_cents AS "priceCents",stock_quantity AS "stockQuantity",active,created_at AS "createdAt" FROM sem_caderno.products WHERE business_id=$1 ORDER BY active DESC,display_name`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,customer_id AS "customerId",total_cents AS "totalCents",paid_cents AS "paidCents",status,created_at AS "createdAt",cancelled_at AS "cancelledAt",cancellation_reason AS "cancellationReason" FROM sem_caderno.sales WHERE business_id=$1 ORDER BY created_at DESC LIMIT 500`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT i.id,i.sale_id AS "saleId",i.product_id AS "productId",i.description_snapshot AS description,i.quantity,i.unit_price_cents AS "unitPriceCents",i.total_cents AS "totalCents" FROM sem_caderno.sale_items i JOIN sem_caderno.sales s ON s.id=i.sale_id WHERE s.business_id=$1 ORDER BY i.id`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,sale_id AS "saleId",amount_cents AS "amountCents",method,created_at AS "createdAt",reversed_at AS "reversedAt",reversal_reason AS "reversalReason" FROM sem_caderno.payments WHERE business_id=$1 ORDER BY created_at DESC LIMIT 1000`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,description,amount_cents AS "amountCents",occurred_on::text AS "occurredOn",created_at AS "createdAt" FROM sem_caderno.expenses WHERE business_id=$1 ORDER BY occurred_on DESC,created_at DESC LIMIT 500`,
          [session.businessId],
        ),
        this.pool.query<Row>(
          `SELECT id,kind,title,detail,amount_cents AS "amountCents",created_at AS "createdAt" FROM sem_caderno.mvp_activities WHERE business_id=$1 ORDER BY created_at DESC LIMIT 200`,
          [session.businessId],
        ),
      ]);
    const businessRow = business.rows[0];
    if (!businessRow) throw new MvpNotFoundError('Estabelecimento não encontrado.');
    const itemMap = new Map<string, SaleItem[]>();
    for (const row of items.rows) {
      const saleId = stringValue(row, 'saleId');
      const list = itemMap.get(saleId) ?? [];
      list.push({
        id: stringValue(row, 'id'),
        ...(optionalString(row, 'productId')
          ? { productId: optionalString(row, 'productId')! }
          : {}),
        description: stringValue(row, 'description'),
        quantity: integerValue(row, 'quantity'),
        unitPriceCents: integerValue(row, 'unitPriceCents'),
        totalCents: integerValue(row, 'totalCents'),
      });
      itemMap.set(saleId, list);
    }
    const mappedSales: Sale[] = sales.rows.map((row) => {
      const status = stringValue(row, 'status') as Sale['status'];
      const totalCents = integerValue(row, 'totalCents');
      const paidCents = integerValue(row, 'paidCents');
      return {
        id: stringValue(row, 'id'),
        ...(optionalString(row, 'customerId')
          ? { customerId: optionalString(row, 'customerId')! }
          : {}),
        items: itemMap.get(stringValue(row, 'id')) ?? [],
        totalCents,
        paidCents,
        outstandingCents: status === 'cancelled' ? 0 : totalCents - paidCents,
        status,
        ...(optionalString(row, 'cancellationReason')
          ? {
              cancellationReason: optionalString(row, 'cancellationReason')!,
              cancelledAt: isoValue(row, 'cancelledAt'),
            }
          : {}),
        createdAt: isoValue(row, 'createdAt'),
      };
    });
    return {
      business: {
        id: session.businessId,
        name: stringValue(businessRow, 'name'),
        ...(optionalString(businessRow, 'pixKey')
          ? { pixKey: optionalString(businessRow, 'pixKey')! }
          : {}),
        demo: false,
      },
      user: { id: session.userId, name: session.userName, email: session.email },
      customers: customers.rows.map(mapCustomer),
      products: products.rows.map(mapProduct),
      sales: mappedSales,
      payments: payments.rows.map(mapPayment),
      expenses: expenses.rows.map(mapExpense),
      activities: activities.rows.map(mapActivity),
    };
  }

  async createCustomer(
    session: PublicSession,
    input: Readonly<{ name: string; phone?: string; note?: string }>,
    key: string,
  ): Promise<Customer> {
    const phone = normalizedPhone(input.phone);
    const validated = {
      name: assertText(input.name, 'Nome do cliente'),
      ...(phone ? { phone } : {}),
      ...(input.note?.trim() ? { note: assertText(input.note, 'Observação', 300) } : {}),
    };
    try {
      return await this.once(session, key, validated, async (client) => {
        const result = await client.query<Row>(
          `INSERT INTO sem_caderno.customers (business_id,display_name,phone,note,created_at) VALUES ($1,$2,$3,$4,now()) RETURNING id,display_name AS name,phone,note,active,created_at AS "createdAt"`,
          [session.businessId, validated.name, validated.phone ?? null, validated.note ?? null],
        );
        return mapCustomer(result.rows[0]!);
      });
    } catch (error) {
      if (hasConstraint(error, 'customers_business_phone_unique'))
        throw new MvpConflictError('Já existe um cliente com este WhatsApp.');
      throw error;
    }
  }

  async updateCustomer(
    session: PublicSession,
    customerId: string,
    input: Readonly<{ name: string; phone?: string; note?: string }>,
    key: string,
  ): Promise<Customer> {
    const phone = normalizedPhone(input.phone);
    const validated = {
      customerId,
      name: assertText(input.name, 'Nome do cliente'),
      ...(phone ? { phone } : {}),
      ...(input.note?.trim() ? { note: assertText(input.note, 'Observação', 300) } : {}),
    };
    try {
      return await this.once(session, key, validated, async (client) => {
        const result = await client.query<Row>(
          `UPDATE sem_caderno.customers SET display_name=$1,phone=$2,note=$3 WHERE id=$4 AND business_id=$5 RETURNING id,display_name AS name,phone,note,active,created_at AS "createdAt"`,
          [
            validated.name,
            validated.phone ?? null,
            validated.note ?? null,
            customerId,
            session.businessId,
          ],
        );
        if (!result.rows[0]) throw new MvpNotFoundError('Cliente não encontrado.');
        return mapCustomer(result.rows[0]);
      });
    } catch (error) {
      if (hasConstraint(error, 'customers_business_phone_unique'))
        throw new MvpConflictError('Já existe um cliente com este WhatsApp.');
      throw error;
    }
  }

  async createProduct(
    session: PublicSession,
    input: Readonly<{ name: string; priceCents: number; stockQuantity: number }>,
    key: string,
  ): Promise<Product> {
    const validated = {
      name: assertText(input.name, 'Nome do produto'),
      priceCents: assertCents(input.priceCents, 'Preço'),
      stockQuantity: assertStock(input.stockQuantity),
    };
    try {
      return await this.once(session, key, validated, async (client) => {
        const result = await client.query<Row>(
          `INSERT INTO sem_caderno.products (business_id,display_name,price_cents,stock_quantity,created_at) VALUES ($1,$2,$3,$4,now()) RETURNING id,display_name AS name,price_cents AS "priceCents",stock_quantity AS "stockQuantity",active,created_at AS "createdAt"`,
          [session.businessId, validated.name, validated.priceCents, validated.stockQuantity],
        );
        return mapProduct(result.rows[0]!);
      });
    } catch (error) {
      if (hasConstraint(error, 'products_business_normalized_name_unique'))
        throw new MvpConflictError('Já existe um produto com este nome.');
      throw error;
    }
  }

  async updateProduct(
    session: PublicSession,
    productId: string,
    input: Readonly<{ name: string; priceCents: number; stockQuantity: number }>,
    key: string,
  ): Promise<Product> {
    const validated = {
      productId,
      name: assertText(input.name, 'Nome do produto'),
      priceCents: assertCents(input.priceCents, 'Preço'),
      stockQuantity: assertStock(input.stockQuantity),
    };
    try {
      return await this.once(session, key, validated, async (client) => {
        const previous = await client.query<Row>(
          `SELECT display_name AS name,stock_quantity AS "stockQuantity" FROM sem_caderno.products WHERE id=$1 AND business_id=$2 FOR UPDATE`,
          [productId, session.businessId],
        );
        if (!previous.rows[0]) throw new MvpNotFoundError('Produto não encontrado.');
        const result = await client.query<Row>(
          `UPDATE sem_caderno.products SET display_name=$1,price_cents=$2,stock_quantity=$3 WHERE id=$4 AND business_id=$5 RETURNING id,display_name AS name,price_cents AS "priceCents",stock_quantity AS "stockQuantity",active,created_at AS "createdAt"`,
          [
            validated.name,
            validated.priceCents,
            validated.stockQuantity,
            productId,
            session.businessId,
          ],
        );
        const product = mapProduct(result.rows[0]!);
        const oldStock = integerValue(previous.rows[0], 'stockQuantity');
        if (oldStock !== product.stockQuantity)
          await this.activity(
            client,
            session,
            'stock',
            'Estoque ajustado',
            `${product.name}: ${oldStock} → ${product.stockQuantity}`,
          );
        return product;
      });
    } catch (error) {
      if (hasConstraint(error, 'products_business_normalized_name_unique'))
        throw new MvpConflictError('Já existe um produto com este nome.');
      throw error;
    }
  }

  async createSale(session: PublicSession, input: SaleDraft, key: string): Promise<Sale> {
    if (input.items.length < 1 || input.items.length > 30)
      throw new MvpValidationError('Adicione pelo menos um item à venda.');
    const requested = input.items.map((item) => {
      const productId = assertText(item.productId, 'Produto');
      const quantity = item.quantity;
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999)
        throw new MvpValidationError('A quantidade do item não é válida.');
      return { productId, quantity };
    });
    const validated = {
      ...(input.customerId ? { customerId: input.customerId } : {}),
      amountPaidCents: input.amountPaidCents,
      paymentMethod: input.paymentMethod,
      items: requested,
    };
    return this.once(session, key, validated, async (client) => {
      if (validated.customerId) {
        const customer = await client.query(
          `SELECT 1 FROM sem_caderno.customers WHERE id=$1 AND business_id=$2 AND active`,
          [validated.customerId, session.businessId],
        );
        if (!customer.rowCount)
          throw new MvpNotFoundError('Cliente não encontrado neste estabelecimento.');
      }
      const quantities = new Map<string, number>();
      for (const item of requested)
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      const productIds = [...quantities.keys()];
      const products = await client.query<Row>(
        `SELECT id,display_name AS name,price_cents AS "priceCents",stock_quantity AS "stockQuantity" FROM sem_caderno.products WHERE business_id=$1 AND active AND id=ANY($2::uuid[]) FOR UPDATE`,
        [session.businessId, productIds],
      );
      if (products.rowCount !== productIds.length)
        throw new MvpNotFoundError('Produto não encontrado neste estabelecimento.');
      const catalog = new Map(products.rows.map((row) => [stringValue(row, 'id'), row]));
      for (const [productId, quantity] of quantities) {
        const product = catalog.get(productId)!;
        applyFinancialRule(() =>
          assertStockAvailable(integerValue(product, 'stockQuantity'), quantity),
        );
      }
      const items = requested.map((item) => {
        const product = catalog.get(item.productId)!;
        const unitPriceCents = integerValue(product, 'priceCents');
        return {
          productId: item.productId,
          description: stringValue(product, 'name'),
          quantity: item.quantity,
          unitPriceCents,
          totalCents: item.quantity * unitPriceCents,
        };
      });
      const preview = applyFinancialRule(() =>
        previewSale(items, input.amountPaidCents, input.customerId !== undefined),
      );
      const saleResult = await client.query<Row>(
        `INSERT INTO sem_caderno.sales (business_id,customer_id,total_cents,paid_cents,status,created_at) VALUES ($1,$2,$3,$4,$5,now()) RETURNING id,created_at AS "createdAt"`,
        [
          session.businessId,
          validated.customerId ?? null,
          preview.totalCents,
          validated.amountPaidCents,
          preview.status,
        ],
      );
      const saleId = stringValue(saleResult.rows[0]!, 'id');
      const mappedItems: SaleItem[] = [];
      for (const item of items) {
        const row = await client.query<Row>(
          `INSERT INTO sem_caderno.sale_items (sale_id,product_id,description_snapshot,quantity,unit_price_cents,total_cents) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [
            saleId,
            item.productId,
            item.description,
            item.quantity,
            item.unitPriceCents,
            item.totalCents,
          ],
        );
        mappedItems.push({ id: stringValue(row.rows[0]!, 'id'), ...item });
      }
      for (const [productId, quantity] of quantities)
        await client.query(
          `UPDATE sem_caderno.products SET stock_quantity=stock_quantity-$1 WHERE id=$2 AND business_id=$3`,
          [quantity, productId, session.businessId],
        );
      if (validated.amountPaidCents > 0)
        await client.query(
          `INSERT INTO sem_caderno.payments (business_id,sale_id,amount_cents,method,created_at) VALUES ($1,$2,$3,$4,now())`,
          [session.businessId, saleId, validated.amountPaidCents, validated.paymentMethod],
        );
      const createdAt = isoValue(saleResult.rows[0]!, 'createdAt');
      const sale: Sale = {
        id: saleId,
        ...(validated.customerId ? { customerId: validated.customerId } : {}),
        items: mappedItems,
        totalCents: preview.totalCents,
        paidCents: validated.amountPaidCents,
        outstandingCents: preview.outstandingCents,
        status: preview.status,
        createdAt,
      };
      await this.activity(
        client,
        session,
        'sale',
        preview.status === 'paid' ? 'Venda paga registrada' : 'Venda com valor em aberto',
        items.map((item) => item.description).join(', '),
        preview.totalCents,
      );
      return sale;
    });
  }

  async recordPayment(
    session: PublicSession,
    input: Readonly<{ saleId: string; amountCents: number; method: Payment['method'] }>,
    key: string,
  ): Promise<Payment> {
    const validated = { ...input, amountCents: assertCents(input.amountCents, 'Valor recebido') };
    return this.once(session, key, validated, async (client) => {
      const saleResult = await client.query<Row>(
        `SELECT total_cents AS "totalCents",paid_cents AS "paidCents",status FROM sem_caderno.sales WHERE id=$1 AND business_id=$2 FOR UPDATE`,
        [input.saleId, session.businessId],
      );
      const sale = saleResult.rows[0];
      if (!sale || stringValue(sale, 'status') === 'cancelled')
        throw new MvpNotFoundError('Venda em aberto não encontrada.');
      const financialPayment = applyFinancialRule(() =>
        applyFinancialPayment(
          integerValue(sale, 'totalCents'),
          integerValue(sale, 'paidCents'),
          validated.amountCents,
        ),
      );
      const result = await client.query<Row>(
        `INSERT INTO sem_caderno.payments (business_id,sale_id,amount_cents,method,created_at) VALUES ($1,$2,$3,$4,now()) RETURNING id,sale_id AS "saleId",amount_cents AS "amountCents",method,created_at AS "createdAt",reversed_at AS "reversedAt",reversal_reason AS "reversalReason"`,
        [session.businessId, input.saleId, validated.amountCents, input.method],
      );
      await client.query(
        `UPDATE sem_caderno.sales SET paid_cents=$1,status=$2 WHERE id=$3 AND business_id=$4`,
        [financialPayment.paidCents, financialPayment.status, input.saleId, session.businessId],
      );
      await this.activity(
        client,
        session,
        'payment',
        'Pagamento recebido',
        'Pagamento registrado manualmente',
        validated.amountCents,
      );
      return mapPayment(result.rows[0]!);
    });
  }

  async createExpense(
    session: PublicSession,
    input: Readonly<{ description: string; amountCents: number; occurredOn: string }>,
    key: string,
  ): Promise<Expense> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn))
      throw new MvpValidationError('Informe uma data válida.');
    const validated = {
      description: assertText(input.description, 'Descrição'),
      amountCents: assertCents(input.amountCents, 'Valor'),
      occurredOn: input.occurredOn,
    };
    return this.once(session, key, validated, async (client) => {
      const result = await client.query<Row>(
        `INSERT INTO sem_caderno.expenses (business_id,description,amount_cents,occurred_on,created_at) VALUES ($1,$2,$3,$4,now()) RETURNING id,description,amount_cents AS "amountCents",occurred_on::text AS "occurredOn",created_at AS "createdAt"`,
        [session.businessId, validated.description, validated.amountCents, validated.occurredOn],
      );
      await this.activity(
        client,
        session,
        'expense',
        'Despesa registrada',
        validated.description,
        validated.amountCents,
      );
      return mapExpense(result.rows[0]!);
    });
  }

  async updateSettings(
    session: PublicSession,
    input: Readonly<{ businessName: string; pixKey?: string }>,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE sem_caderno.businesses SET display_name=$1,pix_key=$2,updated_at=now(),version=version+1 WHERE id=$3 AND state='active'`,
      [
        assertText(input.businessName, 'Nome do estabelecimento'),
        input.pixKey?.trim() ? assertText(input.pixKey, 'Chave Pix', 160) : null,
        session.businessId,
      ],
    );
  }

  async cancelSale(
    session: PublicSession,
    input: Readonly<{ saleId: string; reason: string }>,
    key: string,
  ): Promise<Sale> {
    const validated = { saleId: input.saleId, reason: assertText(input.reason, 'Motivo', 240) };
    return this.once(session, key, validated, async (client) => {
      const result = await client.query<Row>(
        `UPDATE sem_caderno.sales SET status='cancelled',cancelled_at=now(),cancellation_reason=$1 WHERE id=$2 AND business_id=$3 AND status<>'cancelled' RETURNING id,customer_id AS "customerId",total_cents AS "totalCents",paid_cents AS "paidCents",status,created_at AS "createdAt",cancelled_at AS "cancelledAt",cancellation_reason AS "cancellationReason"`,
        [validated.reason, validated.saleId, session.businessId],
      );
      const row = result.rows[0];
      if (!row) throw new MvpNotFoundError('Venda não encontrada ou já cancelada.');
      const stockItems = await client.query<Row>(
        `SELECT product_id AS "productId",SUM(quantity)::integer AS quantity FROM sem_caderno.sale_items WHERE sale_id=$1 AND product_id IS NOT NULL GROUP BY product_id`,
        [validated.saleId],
      );
      for (const item of stockItems.rows)
        await client.query(
          `UPDATE sem_caderno.products SET stock_quantity=stock_quantity+$1 WHERE id=$2 AND business_id=$3`,
          [integerValue(item, 'quantity'), stringValue(item, 'productId'), session.businessId],
        );
      await this.activity(
        client,
        session,
        'correction',
        'Venda cancelada',
        validated.reason,
        integerValue(row, 'totalCents'),
      );
      return {
        id: stringValue(row, 'id'),
        ...(optionalString(row, 'customerId')
          ? { customerId: optionalString(row, 'customerId')! }
          : {}),
        items: [],
        totalCents: integerValue(row, 'totalCents'),
        paidCents: integerValue(row, 'paidCents'),
        outstandingCents: 0,
        status: 'cancelled',
        cancelledAt: isoValue(row, 'cancelledAt'),
        cancellationReason: validated.reason,
        createdAt: isoValue(row, 'createdAt'),
      };
    });
  }

  async createCollection(
    session: PublicSession,
    input: Readonly<{ customerId: string; amountCents: number }>,
    key: string,
  ): Promise<Readonly<{ message: string; whatsappUrl?: string }>> {
    const validated = {
      ...input,
      amountCents: assertCents(input.amountCents, 'Valor da cobrança'),
    };
    return this.once(session, key, validated, async (client) => {
      const result = await client.query<Row>(
        `SELECT c.display_name AS name,c.phone,b.display_name AS "businessName",b.pix_key AS "pixKey" FROM sem_caderno.customers c JOIN sem_caderno.businesses b ON b.id=c.business_id WHERE c.id=$1 AND c.business_id=$2`,
        [input.customerId, session.businessId],
      );
      const row = result.rows[0];
      if (!row) throw new MvpNotFoundError('Cliente não encontrado.');
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(validated.amountCents / 100);
      const pix = optionalString(row, 'pixKey');
      const message = `Olá, ${stringValue(row, 'name')}! Passando para lembrar que há ${formatted} em aberto na ${stringValue(row, 'businessName')}.${pix ? ` Minha chave Pix é ${pix}.` : ''}`;
      await this.activity(
        client,
        session,
        'collection',
        'Lembrete preparado',
        `${stringValue(row, 'name')} · pagamento ainda não recebido`,
        validated.amountCents,
      );
      const phone = optionalString(row, 'phone');
      return {
        message,
        ...(phone
          ? { whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` }
          : {}),
      };
    });
  }

  private async insertSession(
    client: PoolClient,
    evidence: { token: string; csrfToken: string },
    userId: string,
    businessId: string,
    instant: Date,
  ) {
    await client.query(
      `INSERT INTO sem_caderno.mvp_sessions (token_digest,csrf_digest,user_id,business_id,created_at,expires_at) VALUES ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz + interval '12 hours')`,
      [
        digest(evidence.token),
        Buffer.from(evidence.csrfToken, 'utf8'),
        userId,
        businessId,
        instant,
      ],
    );
  }
  private async activity(
    client: PoolClient,
    session: PublicSession,
    kind: Activity['kind'],
    title: string,
    detail: string,
    amountCents?: number,
  ) {
    await client.query(
      `INSERT INTO sem_caderno.mvp_activities (business_id,actor_user_id,kind,title,detail,amount_cents,created_at) VALUES ($1,$2,$3,$4,$5,$6,now())`,
      [session.businessId, session.userId, kind, title, detail, amountCents ?? null],
    );
  }
  private async once<T>(
    session: PublicSession,
    key: string,
    input: unknown,
    execute: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(key))
      throw new MvpValidationError('Identificador da operação inválido.');
    const intent = fingerprint(input);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, [
        `${session.businessId}:${key}`,
      ]);
      const replay = await client.query<Row>(
        `SELECT fingerprint,response_json AS response FROM sem_caderno.mvp_idempotency_records WHERE business_id=$1 AND operation_key=$2`,
        [session.businessId, key],
      );
      if (replay.rows[0]) {
        if (stringValue(replay.rows[0], 'fingerprint') !== intent)
          throw new MvpConflictError(
            'Esta operação já foi usada com outros dados. Atualize a tela e tente novamente.',
          );
        await client.query('COMMIT');
        return replay.rows[0]['response'] as T;
      }
      const value = await execute(client);
      await client.query(
        `INSERT INTO sem_caderno.mvp_idempotency_records (business_id,operation_key,fingerprint,response_json,created_at) VALUES ($1,$2,$3,$4::jsonb,now())`,
        [session.businessId, key, intent, JSON.stringify(value)],
      );
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

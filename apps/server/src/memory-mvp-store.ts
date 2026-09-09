import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

/* eslint-disable @typescript-eslint/require-await -- the in-memory adapter preserves the asynchronous persistence port contract */

import {
  FinancialRuleError,
  MvpConflictError,
  MvpNotFoundError,
  MvpValidationError,
  applyPayment as applyFinancialPayment,
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
} from '@sem-caderno/application';

type MutableSnapshot = {
  business: { id: string; name: string; pixKey?: string; demo: boolean };
  user: { id: string; name: string; email: string };
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  activities: Activity[];
};

type Account = {
  salt: Buffer;
  passwordHash: Buffer;
  snapshot: MutableSnapshot;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashPassword = (password: string, salt: Buffer) =>
  scryptSync(password.normalize('NFC'), salt, 32);
const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

const assertText = (value: string, label: string, maximum = 120): string => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 1 || normalized.length > maximum) {
    throw new MvpValidationError(`${label} não está preenchido corretamente.`);
  }
  return normalized;
};

const assertCents = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MvpValidationError(`${label} deve ser maior que zero.`);
  }
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

const makeSession = (snapshot: MutableSnapshot): PublicSession => ({
  token: randomBytes(32).toString('base64url'),
  csrfToken: randomBytes(24).toString('base64url'),
  userId: snapshot.user.id,
  businessId: snapshot.business.id,
  userName: snapshot.user.name,
  email: snapshot.user.email,
  businessName: snapshot.business.name,
  demo: snapshot.business.demo,
});

const seedSnapshot = (): MutableSnapshot => {
  const businessId = randomUUID();
  const userId = randomUUID();
  const anaId = randomUUID();
  const joaoId = randomUUID();
  const cafeId = randomUUID();
  const lancheId = randomUUID();
  const saleOneId = randomUUID();
  const saleTwoId = randomUUID();
  const saleThreeId = randomUUID();
  const today = new Date();
  const earlier = new Date(today.getTime() - 2 * 86_400_000).toISOString();
  const yesterday = new Date(today.getTime() - 86_400_000).toISOString();
  const createdAt = today.toISOString();
  const customers: Customer[] = [
    { id: anaId, name: 'Ana Souza', phone: '5592999991111', active: true, createdAt: earlier },
    { id: joaoId, name: 'João Lima', phone: '5592988882222', active: true, createdAt: yesterday },
  ];
  const products: Product[] = [
    { id: cafeId, name: 'Café com leite', priceCents: 800, active: true, createdAt: earlier },
    { id: lancheId, name: 'Misto quente', priceCents: 1200, active: true, createdAt: earlier },
  ];
  const sales: Sale[] = [
    {
      id: saleOneId,
      customerId: anaId,
      items: [
        {
          id: randomUUID(),
          productId: lancheId,
          description: 'Misto quente',
          quantity: 2,
          unitPriceCents: 1200,
          totalCents: 2400,
        },
      ],
      totalCents: 2400,
      paidCents: 1000,
      outstandingCents: 1400,
      status: 'partial',
      createdAt: earlier,
    },
    {
      id: saleTwoId,
      customerId: joaoId,
      items: [
        {
          id: randomUUID(),
          description: 'Itens variados',
          quantity: 1,
          unitPriceCents: 3500,
          totalCents: 3500,
        },
      ],
      totalCents: 3500,
      paidCents: 0,
      outstandingCents: 3500,
      status: 'open',
      createdAt: yesterday,
    },
    {
      id: saleThreeId,
      items: [
        {
          id: randomUUID(),
          productId: cafeId,
          description: 'Café com leite',
          quantity: 3,
          unitPriceCents: 800,
          totalCents: 2400,
        },
      ],
      totalCents: 2400,
      paidCents: 2400,
      outstandingCents: 0,
      status: 'paid',
      createdAt,
    },
  ];
  const payments: Payment[] = [
    { id: randomUUID(), saleId: saleOneId, amountCents: 1000, method: 'pix', createdAt: earlier },
    { id: randomUUID(), saleId: saleThreeId, amountCents: 2400, method: 'cash', createdAt },
  ];
  const expenses: Expense[] = [
    {
      id: randomUUID(),
      description: 'Compra de embalagens',
      amountCents: 650,
      occurredOn: createdAt.slice(0, 10),
      createdAt,
    },
  ];
  return {
    business: {
      id: businessId,
      name: 'Mercearia Boa Vizinhança',
      pixKey: 'contato@boavizinhanca.com.br',
      demo: true,
    },
    user: { id: userId, name: 'Marina Oliveira', email: 'demo@semcaderno.app' },
    customers,
    products,
    sales,
    payments,
    expenses,
    activities: [
      {
        id: randomUUID(),
        kind: 'sale',
        title: 'Venda paga registrada',
        detail: '3 × Café com leite',
        amountCents: 2400,
        createdAt,
      },
      {
        id: randomUUID(),
        kind: 'expense',
        title: 'Despesa registrada',
        detail: 'Compra de embalagens',
        amountCents: 650,
        createdAt,
      },
      {
        id: randomUUID(),
        kind: 'sale',
        title: 'Venda fiada registrada',
        detail: 'João Lima · Itens variados',
        amountCents: 3500,
        createdAt: yesterday,
      },
    ],
  };
};

export class MemoryMvpStore implements MvpStore {
  private readonly accounts = new Map<string, Account>();
  private readonly sessions = new Map<string, PublicSession>();
  private readonly idempotency = new Map<string, { fingerprint: string; value: unknown }>();

  constructor() {
    const snapshot = seedSnapshot();
    const salt = randomBytes(16);
    this.accounts.set(snapshot.user.email, {
      salt,
      passwordHash: hashPassword('semcaderno', salt),
      snapshot,
    });
  }

  async register(
    input: Readonly<{ name: string; email: string; password: string; businessName: string }>,
  ): Promise<PublicSession> {
    const email = normalizeEmail(input.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new MvpValidationError('Informe um e-mail válido.');
    const passwordLength = Array.from(input.password).length;
    if (passwordLength < 8 || passwordLength > 128)
      throw new MvpValidationError('A senha deve ter entre 8 e 128 caracteres.');
    if (this.accounts.has(email))
      throw new MvpConflictError('Já existe uma conta com este e-mail.');
    const salt = randomBytes(16);
    const snapshot: MutableSnapshot = {
      business: {
        id: randomUUID(),
        name: assertText(input.businessName, 'Nome do estabelecimento'),
        demo: false,
      },
      user: { id: randomUUID(), name: assertText(input.name, 'Seu nome'), email },
      customers: [],
      products: [],
      sales: [],
      payments: [],
      expenses: [],
      activities: [],
    };
    this.accounts.set(email, { salt, passwordHash: hashPassword(input.password, salt), snapshot });
    const session = makeSession(snapshot);
    this.sessions.set(session.token, session);
    return clone(session);
  }

  async signIn(
    input: Readonly<{ email: string; password: string }>,
  ): Promise<PublicSession | undefined> {
    if (Array.from(input.password).length > 128) return undefined;
    const account = this.accounts.get(normalizeEmail(input.email));
    if (!account) return undefined;
    const candidate = hashPassword(input.password, account.salt);
    if (!timingSafeEqual(candidate, account.passwordHash)) return undefined;
    const session = makeSession(account.snapshot);
    this.sessions.set(session.token, session);
    return clone(session);
  }

  async signOut(token: string): Promise<void> {
    this.sessions.delete(token);
  }
  async session(token: string): Promise<PublicSession | undefined> {
    const value = this.sessions.get(token);
    return value ? clone(value) : undefined;
  }

  async snapshot(session: PublicSession): Promise<BusinessSnapshot> {
    return clone(this.requireAccount(session).snapshot);
  }

  async createCustomer(
    session: PublicSession,
    input: Readonly<{ name: string; phone?: string; note?: string }>,
    key: string,
  ): Promise<Customer> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      const customer: Customer = {
        id: randomUUID(),
        name: assertText(input.name, 'Nome do cliente'),
        ...(input.phone?.trim() ? { phone: input.phone.replace(/\D/g, '') } : {}),
        ...(input.note?.trim() ? { note: assertText(input.note, 'Observação', 300) } : {}),
        active: true,
        createdAt: now(),
      };
      snapshot.customers.unshift(customer);
      return customer;
    });
  }

  async createProduct(
    session: PublicSession,
    input: Readonly<{ name: string; priceCents: number }>,
    key: string,
  ): Promise<Product> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      const product: Product = {
        id: randomUUID(),
        name: assertText(input.name, 'Nome do produto'),
        priceCents: assertCents(input.priceCents, 'Preço'),
        active: true,
        createdAt: now(),
      };
      snapshot.products.unshift(product);
      return product;
    });
  }

  async createSale(session: PublicSession, input: SaleDraft, key: string): Promise<Sale> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      if (input.items.length < 1 || input.items.length > 30)
        throw new MvpValidationError('Adicione pelo menos um item à venda.');
      const items = input.items.map((item) => {
        const quantity = item.quantity;
        const unitPriceCents = assertCents(item.unitPriceCents, 'Valor do item');
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999)
          throw new MvpValidationError('A quantidade do item não é válida.');
        return {
          id: randomUUID(),
          ...(item.productId ? { productId: item.productId } : {}),
          description: assertText(item.description, 'Descrição do item'),
          quantity,
          unitPriceCents,
          totalCents: quantity * unitPriceCents,
        };
      });
      const preview = applyFinancialRule(() =>
        previewSale(items, input.amountPaidCents, input.customerId !== undefined),
      );
      const { totalCents, outstandingCents, status } = preview;
      if (
        input.customerId &&
        !snapshot.customers.some((customer) => customer.id === input.customerId && customer.active)
      )
        throw new MvpNotFoundError('Cliente não encontrado neste estabelecimento.');
      const sale: Sale = {
        id: randomUUID(),
        ...(input.customerId ? { customerId: input.customerId } : {}),
        items,
        totalCents,
        paidCents: input.amountPaidCents,
        outstandingCents,
        status,
        createdAt: now(),
      };
      snapshot.sales.unshift(sale);
      if (input.amountPaidCents > 0)
        snapshot.payments.unshift({
          id: randomUUID(),
          saleId: sale.id,
          amountCents: input.amountPaidCents,
          method: input.paymentMethod,
          createdAt: sale.createdAt,
        });
      const customer = snapshot.customers.find((item) => item.id === input.customerId);
      snapshot.activities.unshift({
        id: randomUUID(),
        kind: 'sale',
        title: outstandingCents ? 'Venda com valor em aberto' : 'Venda paga registrada',
        detail: customer
          ? `${customer.name} · ${items.map((item) => item.description).join(', ')}`
          : items.map((item) => item.description).join(', '),
        amountCents: totalCents,
        createdAt: sale.createdAt,
      });
      return sale;
    });
  }

  async recordPayment(
    session: PublicSession,
    input: Readonly<{ saleId: string; amountCents: number; method: Payment['method'] }>,
    key: string,
  ): Promise<Payment> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      const index = snapshot.sales.findIndex((sale) => sale.id === input.saleId);
      const sale = snapshot.sales[index];
      if (!sale || sale.status === 'cancelled')
        throw new MvpNotFoundError('Venda em aberto não encontrada.');
      const amount = assertCents(input.amountCents, 'Valor recebido');
      const financialPayment = applyFinancialRule(() =>
        applyFinancialPayment(sale.totalCents, sale.paidCents, amount),
      );
      const payment: Payment = {
        id: randomUUID(),
        saleId: sale.id,
        amountCents: amount,
        method: input.method,
        createdAt: now(),
      };
      snapshot.sales[index] = {
        ...sale,
        ...financialPayment,
      };
      snapshot.payments.unshift(payment);
      const customer = snapshot.customers.find((item) => item.id === sale.customerId);
      snapshot.activities.unshift({
        id: randomUUID(),
        kind: 'payment',
        title: 'Pagamento recebido',
        detail: customer?.name ?? 'Cliente',
        amountCents: amount,
        createdAt: payment.createdAt,
      });
      return payment;
    });
  }

  async createExpense(
    session: PublicSession,
    input: Readonly<{ description: string; amountCents: number; occurredOn: string }>,
    key: string,
  ): Promise<Expense> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn))
        throw new MvpValidationError('Informe uma data válida.');
      const expense: Expense = {
        id: randomUUID(),
        description: assertText(input.description, 'Descrição'),
        amountCents: assertCents(input.amountCents, 'Valor'),
        occurredOn: input.occurredOn,
        createdAt: now(),
      };
      snapshot.expenses.unshift(expense);
      snapshot.activities.unshift({
        id: randomUUID(),
        kind: 'expense',
        title: 'Despesa registrada',
        detail: expense.description,
        amountCents: expense.amountCents,
        createdAt: expense.createdAt,
      });
      return expense;
    });
  }

  async updateSettings(
    session: PublicSession,
    input: Readonly<{ businessName: string; pixKey?: string }>,
  ): Promise<void> {
    const snapshot = this.requireAccount(session).snapshot;
    snapshot.business.name = assertText(input.businessName, 'Nome do estabelecimento');
    if (input.pixKey?.trim()) snapshot.business.pixKey = assertText(input.pixKey, 'Chave Pix', 160);
    else delete snapshot.business.pixKey;
  }

  async cancelSale(
    session: PublicSession,
    input: Readonly<{ saleId: string; reason: string }>,
    key: string,
  ): Promise<Sale> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      const index = snapshot.sales.findIndex((sale) => sale.id === input.saleId);
      const sale = snapshot.sales[index];
      if (!sale) throw new MvpNotFoundError('Venda não encontrada.');
      if (sale.status === 'cancelled') return sale;
      const reason = assertText(input.reason, 'Motivo', 240);
      const cancelled: Sale = {
        ...sale,
        status: 'cancelled',
        outstandingCents: 0,
        cancelledAt: now(),
        cancellationReason: reason,
      };
      snapshot.sales[index] = cancelled;
      snapshot.activities.unshift({
        id: randomUUID(),
        kind: 'correction',
        title: 'Venda cancelada',
        detail: reason,
        amountCents: sale.totalCents,
        createdAt: cancelled.cancelledAt!,
      });
      return cancelled;
    });
  }

  async createCollection(
    session: PublicSession,
    input: Readonly<{ customerId: string; amountCents: number }>,
    key: string,
  ): Promise<Readonly<{ message: string; whatsappUrl?: string }>> {
    return this.once(session, key, input, () => {
      const snapshot = this.requireAccount(session).snapshot;
      const customer = snapshot.customers.find((item) => item.id === input.customerId);
      if (!customer) throw new MvpNotFoundError('Cliente não encontrado.');
      const amount = assertCents(input.amountCents, 'Valor da cobrança');
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount / 100);
      const pix = snapshot.business.pixKey ? ` Minha chave Pix é ${snapshot.business.pixKey}.` : '';
      const message = `Olá, ${customer.name}! Passando para lembrar que há ${formatted} em aberto na ${snapshot.business.name}.${pix}`;
      snapshot.activities.unshift({
        id: randomUUID(),
        kind: 'collection',
        title: 'Lembrete preparado',
        detail: `${customer.name} · pagamento ainda não recebido`,
        amountCents: amount,
        createdAt: now(),
      });
      return {
        message,
        ...(customer.phone
          ? { whatsappUrl: `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}` }
          : {}),
      };
    });
  }

  private requireAccount(session: PublicSession): Account {
    const account = this.accounts.get(session.email);
    if (
      !account ||
      account.snapshot.user.id !== session.userId ||
      account.snapshot.business.id !== session.businessId
    )
      throw new MvpNotFoundError('Sessão inválida.');
    return account;
  }

  private async once<T>(
    session: PublicSession,
    key: string,
    input: unknown,
    execute: () => T,
  ): Promise<T> {
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(key))
      throw new MvpValidationError('Identificador da operação inválido.');
    const compound = `${session.businessId}:${key}`;
    const fingerprint = JSON.stringify(input);
    const found = this.idempotency.get(compound);
    if (found) {
      if (found.fingerprint !== fingerprint)
        throw new MvpConflictError(
          'Esta operação já foi usada com outros dados. Atualize a tela e tente novamente.',
        );
      return clone(found.value as T);
    }
    const value = execute();
    this.idempotency.set(compound, { fingerprint, value: clone(value) });
    return clone(value);
  }
}

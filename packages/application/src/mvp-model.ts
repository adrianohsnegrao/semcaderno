export type FinancialStatus = 'open' | 'partial' | 'paid' | 'cancelled';
export type Customer = Readonly<{
  id: string;
  name: string;
  phone?: string;
  note?: string;
  active: boolean;
  createdAt: string;
}>;
export type Product = Readonly<{
  id: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
}>;
export type SaleItem = Readonly<{
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}>;
export type Payment = Readonly<{
  id: string;
  saleId: string;
  amountCents: number;
  method: 'cash' | 'pix' | 'card' | 'other';
  reversedAt?: string;
  reversalReason?: string;
  createdAt: string;
}>;
export type Sale = Readonly<{
  id: string;
  customerId?: string;
  items: readonly SaleItem[];
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  status: FinancialStatus;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}>;
export type Expense = Readonly<{
  id: string;
  description: string;
  amountCents: number;
  occurredOn: string;
  createdAt: string;
}>;
export type Activity = Readonly<{
  id: string;
  kind: 'sale' | 'payment' | 'expense' | 'collection' | 'correction' | 'stock';
  title: string;
  detail: string;
  amountCents?: number;
  createdAt: string;
}>;
export type BusinessSnapshot = Readonly<{
  business: Readonly<{ id: string; name: string; pixKey?: string; demo: boolean }>;
  user: Readonly<{ id: string; name: string; email: string }>;
  customers: readonly Customer[];
  products: readonly Product[];
  sales: readonly Sale[];
  payments: readonly Payment[];
  expenses: readonly Expense[];
  activities: readonly Activity[];
}>;
export type PublicSession = Readonly<{
  token: string;
  csrfToken: string;
  userId: string;
  businessId: string;
  userName: string;
  email: string;
  businessName: string;
  demo: boolean;
}>;
export type SaleDraft = Readonly<{
  customerId?: string;
  amountPaidCents: number;
  paymentMethod: Payment['method'];
  items: readonly Readonly<{
    productId: string;
    quantity: number;
  }>[];
}>;

export type MvpStore = Readonly<{
  register(
    input: Readonly<{ name: string; email: string; password: string; businessName: string }>,
  ): Promise<PublicSession>;
  signIn(input: Readonly<{ email: string; password: string }>): Promise<PublicSession | undefined>;
  signOut(token: string): Promise<void>;
  session(token: string): Promise<PublicSession | undefined>;
  snapshot(session: PublicSession): Promise<BusinessSnapshot>;
  createCustomer(
    session: PublicSession,
    input: Readonly<{ name: string; phone?: string; note?: string }>,
    idempotencyKey: string,
  ): Promise<Customer>;
  updateCustomer(
    session: PublicSession,
    customerId: string,
    input: Readonly<{ name: string; phone?: string; note?: string }>,
    idempotencyKey: string,
  ): Promise<Customer>;
  createProduct(
    session: PublicSession,
    input: Readonly<{ name: string; priceCents: number; stockQuantity: number }>,
    idempotencyKey: string,
  ): Promise<Product>;
  updateProduct(
    session: PublicSession,
    productId: string,
    input: Readonly<{ name: string; priceCents: number; stockQuantity: number }>,
    idempotencyKey: string,
  ): Promise<Product>;
  createSale(session: PublicSession, input: SaleDraft, idempotencyKey: string): Promise<Sale>;
  recordPayment(
    session: PublicSession,
    input: Readonly<{ saleId: string; amountCents: number; method: Payment['method'] }>,
    idempotencyKey: string,
  ): Promise<Payment>;
  createExpense(
    session: PublicSession,
    input: Readonly<{ description: string; amountCents: number; occurredOn: string }>,
    idempotencyKey: string,
  ): Promise<Expense>;
  updateSettings(
    session: PublicSession,
    input: Readonly<{ businessName: string; pixKey?: string }>,
  ): Promise<void>;
  cancelSale(
    session: PublicSession,
    input: Readonly<{ saleId: string; reason: string }>,
    idempotencyKey: string,
  ): Promise<Sale>;
  createCollection(
    session: PublicSession,
    input: Readonly<{ customerId: string; amountCents: number }>,
    idempotencyKey: string,
  ): Promise<Readonly<{ message: string; whatsappUrl?: string }>>;
}>;

export class MvpConflictError extends Error {}
export class MvpNotFoundError extends Error {}
export class MvpValidationError extends Error {}

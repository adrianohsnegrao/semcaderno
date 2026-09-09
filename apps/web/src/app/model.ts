export type Customer = {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  active: boolean;
  createdAt: string;
};
export type Product = {
  id: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
  active: boolean;
  createdAt: string;
};
export type SaleItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};
export type Sale = {
  id: string;
  customerId?: string;
  items: SaleItem[];
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  status: 'open' | 'partial' | 'paid' | 'cancelled';
  createdAt: string;
};
export type Payment = {
  id: string;
  saleId: string;
  amountCents: number;
  method: string;
  createdAt: string;
};
export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  occurredOn: string;
  createdAt: string;
};
export type Activity = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  amountCents?: number;
  createdAt: string;
};
export type Snapshot = {
  business: {
    id: string;
    name: string;
    pixKey?: string;
    demo: boolean;
    whatsapp: {
      status: 'not_configured' | 'incomplete' | 'ready' | 'disabled';
      wabaId?: string;
      phoneNumberId?: string;
      templateName?: string;
      tokenConfigured: boolean;
      enabled: boolean;
    };
  };
  user: { id: string; name: string; email: string };
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  activities: Activity[];
};
export type Session = {
  user: { id: string; name: string; email: string };
  business: { id: string; name: string; demo: boolean };
  csrfToken: string;
};
export type View =
  'home' | 'sale' | 'customers' | 'products' | 'expenses' | 'activity' | 'settings';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://127.0.0.1:3001';
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
export const parseMoney = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};
export const formatMoneyInput = (value: string) => money(parseMoney(value));
export const formatPhone = (value?: string) => {
  if (!value) return '';
  const local = value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value;
};
const operationKey = () => crypto.randomUUID().replaceAll('-', '_');

export async function request<T>(
  path: string,
  options: RequestInit = {},
  csrf?: string,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(csrf ? { 'x-sem-caderno-csrf': csrf } : {}),
      ...(options.method && options.method !== 'GET' ? { 'idempotency-key': operationKey() } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(problem.detail ?? 'Não foi possível concluir. Tente novamente.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

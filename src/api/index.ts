import { api } from '@/api/client';
import type { WorkTime } from '@/lib/format';

export type User = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  hourly_rate_cents: number | null;
  workday_hours: number;
};

export type Account = {
  id: number;
  name: string;
  kind: 'checking' | 'cash' | 'savings' | 'credit_card';
  institution: string | null;
  color: string | null;
  icon: string | null;
  opening_balance_cents: number;
  credit_limit_cents: number | null;
  closing_day: number | null;
  due_day: number | null;
  archived: boolean;
  balance_cents: number;
};

export type Category = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  kind: 'expense' | 'income';
  sort_order: number;
};

export type Transaction = {
  id: number;
  account_id: number;
  category_id: number | null;
  kind: 'expense' | 'income' | 'transfer_out' | 'transfer_in';
  amount_cents: number;
  description: string | null;
  occurred_at: string;
  created_via: string;
  transfer_group_id: string | null;
  installment_no: number | null;
  installment_total: number | null;
};

export type Period = '7d' | '30d' | '3m' | '6m';

export type Summary = {
  period: Period;
  start: string;
  end: string;
  balance_cents: number;
  expense_cents: number;
  income_cents: number;
  by_category: {
    category_id: number | null;
    name: string;
    emoji: string | null;
    color: string | null;
    total_cents: number;
  }[];
  by_day: { day: string; expense_cents: number; income_cents: number }[];
  expense_work_time: WorkTime | null;
  balance_work_time: WorkTime | null;
};

type AuthResponse = { access_token: string };

export const registerUser = (email: string, password: string, name?: string) =>
  api.post<AuthResponse>('/auth/register', { email, password, name: name || null });

export const loginUser = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password });

export const getMe = () => api.get<User>('/auth/me');

export const updateMe = (payload: Partial<Pick<User, 'name' | 'hourly_rate_cents' | 'workday_hours'>>) =>
  api.patch<User>('/auth/me', payload);

export const listAccounts = () => api.get<Account[]>('/accounts');

export const createAccount = (payload: {
  name: string;
  kind?: Account['kind'];
  icon?: string | null;
  opening_balance_cents?: number;
}) => api.post<Account>('/accounts', payload);

export const updateAccount = (id: number, payload: Partial<Account>) =>
  api.patch<Account>(`/accounts/${id}`, payload);

export const listCategories = (kind?: Category['kind']) =>
  api.get<Category[]>(`/categories${kind ? `?kind=${kind}` : ''}`);

export const listTransactions = (params: { limit?: number; account_id?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.account_id) query.set('account_id', String(params.account_id));
  const suffix = query.toString();
  return api.get<Transaction[]>(`/transactions${suffix ? `?${suffix}` : ''}`);
};

export const createTransaction = (payload: {
  account_id: number;
  category_id?: number | null;
  kind: 'expense' | 'income';
  amount_cents: number;
  description?: string | null;
}) => api.post<Transaction>('/transactions', payload);

export const deleteTransaction = (id: number) => api.delete<void>(`/transactions/${id}`);

export const getSummary = (period: Period) => api.get<Summary>(`/summary?period=${period}`);

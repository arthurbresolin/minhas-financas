import { api } from '@/api/client';
import type { TimeCost } from '@/lib/format';
import type { ThemeTokens } from '@/theme/tokens';

export type User = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  hourly_rate_cents: number | null;
  workday_hours: number;
  /** De onde vem o dinheiro: você troca horas por ele, ou recebe mesada. */
  income_mode: 'work' | 'allowance';
  allowance_cents: number | null;
  allowance_period: 'week' | 'month';
  active_theme_id: number | null;
};

/** Espelha `ThemeTokens` do backend — as cores, sem id nem nome. */
export type ApiThemeTokens = ThemeTokens;

export type ApiTheme = {
  id: number;
  name: string;
  is_preset: boolean;
  tokens: ApiThemeTokens;
};

/** A fatura aberta de um cartão. Derivada no servidor, nunca guardada. */
export type Fatura = {
  /** Quanto já entrou nela. Positivo — é dívida, não saldo. */
  total_cents: number;
  fecha_em: string;
  vence_em: string;
  /** 0 quando fecha hoje. É o número que faz a pessoa segurar a compra. */
  dias_ate_fechar: number;
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
  /** Num cartão isto é negativo e significa "quanto se deve no total". */
  balance_cents: number;
  /** Só em cartão de crédito com fechamento e vencimento configurados. */
  fatura: Fatura | null;
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
  expense_time_cost: TimeCost | null;
  balance_time_cost: TimeCost | null;
};

type AuthResponse = { access_token: string };

export const registerUser = (email: string, password: string, name?: string) =>
  api.post<AuthResponse>('/auth/register', { email, password, name: name || null });

export const loginUser = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password });

export const getMe = () => api.get<User>('/auth/me');

export const updateMe = (
  payload: Partial<
    Pick<
      User,
      | 'name'
      | 'hourly_rate_cents'
      | 'workday_hours'
      | 'income_mode'
      | 'allowance_cents'
      | 'allowance_period'
    >
  >,
) => api.patch<User>('/auth/me', payload);

export const listAccounts = () => api.get<Account[]>('/accounts');

export const createAccount = (payload: {
  name: string;
  kind?: Account['kind'];
  icon?: string | null;
  opening_balance_cents?: number;
  closing_day?: number | null;
  due_day?: number | null;
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

/**
 * Move dinheiro entre duas contas suas.
 *
 * É também como se paga a fatura do cartão: sai da conta, entra no cartão, e a
 * dívida anda pra zero. Pagar fatura não precisou de conceito novo.
 */
export const createTransfer = (payload: {
  from_account_id: number;
  to_account_id: number;
  amount_cents: number;
  description?: string | null;
}) => api.post<Transaction[]>('/transactions/transfer', payload);

export const listThemes = () => api.get<ApiTheme[]>('/themes');

export const activateTheme = (id: number) => api.post<ApiTheme>(`/themes/${id}/activate`, {});

export const getSummary = (period: Period) => api.get<Summary>(`/summary?period=${period}`);

// ---------------------------------------------------------------------------
// Metas (potes)
// ---------------------------------------------------------------------------

export type Goal = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  target_cents: number;
  done_at: string | null;
  archived: boolean;
  sort_order: number;
  /** Derivado no servidor: a soma dos depósitos. */
  saved_cents: number;
  /** Já entre 0 e 1 — a barra da tela não precisa se defender. */
  progress: number;
  saved_time_cost: TimeCost | null;
};

export const listGoals = () => api.get<Goal[]>('/goals');

export const createGoal = (payload: {
  name: string;
  target_cents: number;
  emoji?: string | null;
  color?: string | null;
}) => api.post<Goal>('/goals', payload);

export const updateGoal = (
  id: number,
  payload: Partial<Pick<Goal, 'name' | 'emoji' | 'color' | 'target_cents' | 'archived'>>,
) => api.patch<Goal>(`/goals/${id}`, payload);

export const deleteGoal = (id: number) => api.delete<void>(`/goals/${id}`);

/**
 * Guarda (positivo) ou resgata (negativo) num pote.
 *
 * `just_completed` vem do servidor porque só ele sabe se *este* depósito foi o
 * que bateu a meta — é o que dispara a tela de comemoração uma vez só.
 */
export const depositGoal = (id: number, amount_cents: number) =>
  api.post<{ goal: Goal; just_completed: boolean }>(`/goals/${id}/deposit`, { amount_cents });

// ---------------------------------------------------------------------------
// Lançamentos que se repetem
// ---------------------------------------------------------------------------

export type RecurringRule = {
  id: number;
  account_id: number;
  category_id: number | null;
  kind: 'expense' | 'income';
  amount_cents: number;
  description: string | null;
  /** 1 a 31. Num mês curto o servidor joga pro último dia. */
  day_of_month: number;
  active: boolean;
  start_on: string;
  last_applied_on: string | null;
  /** Quando vai gerar de novo. Nulo quando está desligada. */
  proxima_em: string | null;
};

export const listRecurring = () => api.get<RecurringRule[]>('/recurring');

export const createRecurring = (payload: {
  account_id: number;
  kind: RecurringRule['kind'];
  amount_cents: number;
  day_of_month: number;
  description?: string | null;
  category_id?: number | null;
  start_on?: string | null;
}) => api.post<RecurringRule>('/recurring', payload);

export const updateRecurring = (
  id: number,
  payload: Partial<Pick<RecurringRule, 'amount_cents' | 'description' | 'day_of_month' | 'active'>>,
) => api.patch<RecurringRule>(`/recurring/${id}`, payload);

export const deleteRecurring = (id: number) => api.delete<void>(`/recurring/${id}`);

// ---------------------------------------------------------------------------
// Atalho do iPhone
// ---------------------------------------------------------------------------

/**
 * O token que vive dentro do Atalho, separado da senha.
 *
 * Ele só consegue criar lançamento — nunca ler saldo, nunca apagar nada — e
 * pode ser revogado sozinho. É o que permite deixá-lo dentro de um Atalho no
 * aparelho, onde qualquer pessoa com o celular na mão pode abrir e ler.
 */
export const getShortcutToken = () => api.get<{ token: string }>('/shortcut/token');

/** Cria o token, ou troca o que já existia — o anterior morre na hora. */
export const createShortcutToken = () => api.post<{ token: string }>('/shortcut/token', {});

export const revokeShortcutToken = () => api.delete<void>('/shortcut/token');

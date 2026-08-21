/** Dinheiro trafega e é guardado em centavos inteiros; formatar é coisa da borda. */
export function formatMoney(cents: number, { showSign = false } = {}): string {
  const value = Math.abs(cents) / 100;
  const formatted = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  if (!showSign) return cents < 0 ? `-${formatted}` : formatted;
  return `${cents < 0 ? '-' : '+'}${formatted}`;
}

/** Só os dígitos, pro campo de valor: digitar "1234" vira R$ 12,34. */
export function centsFromDigits(digits: string): number {
  const onlyDigits = digits.replace(/\D/g, '').slice(0, 11);
  return onlyDigits ? parseInt(onlyDigits, 10) : 0;
}

/**
 * Quanto do seu dinheiro-que-entra aquilo custou.
 *
 * `label` é a frase pronta — "2 horas de trabalho", "6 dias de mesada" — e é
 * ela que as telas mostram. Nenhuma tela sabe se a pessoa trabalha ou recebe
 * mesada, e é justamente por isso que trocar de modo não exige tocar em tela
 * nenhuma.
 */
export type TimeCost = {
  mode: 'work' | 'allowance';
  label: string;
  total_hours: number;
  days: number;
  hours: number;
  /** Só no modo mesada: a fração da mesada. 0.08 = 8%. */
  ratio: number;
};

const MONTHS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** "Hoje" / "Ontem" / "12 de mar" — cabeçalho de grupo do extrato. */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Hoje';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Ontem';

  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * A prévia curtinha do custo, enquanto a pessoa digita.
 *
 * Existe duplicada do servidor de propósito: o botão de salvar mostra o custo a
 * cada tecla, e uma ida à rede por dígito seria absurda. O servidor continua
 * sendo a verdade nos totais — isto aqui é só a prévia.
 *
 * É curta porque cabe num botão, não numa tela: "1h 27m", "6d de mesada". A
 * frase longa e definitiva vem do servidor, no campo `label`.
 *
 * Precisa acompanhar `app/services/timecost.py`.
 */
export type FonteDeRenda = {
  income_mode?: 'work' | 'allowance' | string;
  hourly_rate_cents?: number | null;
  workday_hours?: number;
  allowance_cents?: number | null;
  allowance_period?: string;
};

const DIAS_POR_PERIODO: Record<string, number> = { week: 7, month: 30 };

export function previewTimeCost(cents: number, fonte: FonteDeRenda | null | undefined): string | null {
  // Sem valor digitado não há custo a mostrar — arredondar zero pra "1m" faria
  // o botão de salvar mentir antes mesmo de a pessoa digitar.
  if (!fonte || cents <= 0) return null;

  if (fonte.income_mode === 'allowance') {
    const mesada = fonte.allowance_cents;
    if (!mesada || mesada <= 0) return null;
    const nome = fonte.allowance_period === 'week' ? 'semanada' : 'mesada';
    const porDia = mesada / (DIAS_POR_PERIODO[fonte.allowance_period ?? 'month'] ?? 30);
    const dias = cents / porDia;
    if (cents >= mesada) {
      const quantas = cents / mesada;
      const texto = quantas < 1.1 ? '1' : quantas.toFixed(1).replace('.', ',').replace(',0', '');
      return `${texto} ${nome}${quantas < 1.1 ? '' : 's'}`;
    }
    if (dias >= 1) return `${Math.floor(dias)}d de ${nome}`;
    return `${Math.max(1, Math.floor((cents / mesada) * 100 + 0.5))}% da ${nome}`;
  }

  const hora = fonte.hourly_rate_cents;
  if (!hora || hora <= 0) return null;
  const jornada = Math.max(1, fonte.workday_hours ?? 8);
  const totalHoras = cents / hora;

  if (totalHoras < 1) return `${Math.max(1, Math.round(totalHoras * 60))}m`;
  if (totalHoras < jornada) {
    const inteiras = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - inteiras) * 60);
    return minutos ? `${inteiras}h ${minutos}m` : `${inteiras}h`;
  }
  const dias = Math.floor(totalHoras / jornada);
  const horas = Math.round(totalHoras - dias * jornada);
  return horas ? `${dias}d ${horas}h` : `${dias}d`;
}

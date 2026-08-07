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

export type WorkTime = { total_hours: number; days: number; hours: number };

/** "2 dias e 3 horas" — a frase que dá peso ao número. */
export function formatWorkTime(workTime: WorkTime | null | undefined): string | null {
  if (!workTime) return null;
  const { days, hours } = workTime;
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`;
  const hourLabel = hours === 1 ? '1 hora' : `${hours} horas`;
  if (days === 0) return hourLabel;
  if (hours === 0) return dayLabel;
  return `${dayLabel} e ${hourLabel}`;
}

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

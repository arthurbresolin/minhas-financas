import { previewTimeCost } from '@/lib/format';

/**
 * A prévia do custo, que roda no app enquanto a pessoa digita.
 *
 * Ela é uma cópia deliberada do `time_cost` do servidor — existe pra não pedir
 * uma ida à rede por tecla. O risco de toda cópia é divergir, então o que estes
 * testes travam são os mesmos casos que `tests/test_mesada.py` trava do outro
 * lado.
 */

const TRABALHO = { income_mode: 'work' as const, hourly_rate_cents: 3_000, workday_hours: 8 };
const MESADA = {
  income_mode: 'allowance' as const,
  allowance_cents: 30_000,
  allowance_period: 'month',
};

describe('quem trabalha', () => {
  it('mostra minutos quando não fecha uma hora', () => {
    expect(previewTimeCost(1_500, TRABALHO)).toBe('30m');
  });

  it('mostra horas e minutos dentro de um dia', () => {
    expect(previewTimeCost(4_500, TRABALHO)).toBe('1h 30m');
  });

  it('vira dias quando passa da jornada', () => {
    // R$ 240 a R$ 30/h = 8h = um dia de trabalho.
    expect(previewTimeCost(24_000, TRABALHO)).toBe('1d');
  });

  it('não inventa nada sem o valor da hora', () => {
    expect(previewTimeCost(1_000, { income_mode: 'work' })).toBeNull();
    expect(previewTimeCost(1_000, { income_mode: 'work', hourly_rate_cents: 0 })).toBeNull();
  });
});

describe('quem recebe mesada', () => {
  it('mostra porcentagem quando não chega a um dia', () => {
    // R$ 5 de uma mesada de R$ 300 é menos de um dia.
    expect(previewTimeCost(500, MESADA)).toBe('2% da mesada');
  });

  it('mostra dias a partir de um dia', () => {
    // R$ 60 de R$ 300/mês = R$ 10/dia = 6 dias.
    expect(previewTimeCost(6_000, MESADA)).toBe('6d de mesada');
  });

  it('mostra a mesada inteira quando o gasto é do tamanho dela', () => {
    expect(previewTimeCost(30_000, MESADA)).toBe('1 mesada');
  });

  it('conta em mesadas quando passa de uma', () => {
    expect(previewTimeCost(93_000, MESADA)).toBe('3,1 mesadas');
  });

  it('chama de semanada quem recebe por semana', () => {
    const semanal = { ...MESADA, allowance_period: 'week', allowance_cents: 10_000 };
    expect(previewTimeCost(5_000, semanal)).toContain('semanada');
  });

  it('nunca fala em trabalho', () => {
    expect(previewTimeCost(6_000, MESADA)).not.toContain('trabalho');
    expect(previewTimeCost(6_000, MESADA)).not.toContain('h ');
  });

  it('não inventa nada sem a mesada informada', () => {
    expect(previewTimeCost(1_000, { income_mode: 'allowance' })).toBeNull();
  });
});

describe('sem valor digitado', () => {
  it('não mostra custo nenhum', () => {
    // Arredondar zero pra "1m" faria o botão de salvar mentir antes de a
    // pessoa digitar qualquer coisa.
    expect(previewTimeCost(0, TRABALHO)).toBeNull();
    expect(previewTimeCost(0, MESADA)).toBeNull();
    expect(previewTimeCost(1_000, null)).toBeNull();
  });
});

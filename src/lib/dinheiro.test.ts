import { centsFromDigits, formatMoney } from '@/lib/format';

/**
 * O contrato do campo de valor.
 *
 * `centsFromDigits` é a regra inteira do `MoneyInput`: a pessoa digita só
 * números e os centavos preenchem da direita pra esquerda. Ela ficou sem teste
 * quando o teclado com calculadora saiu — e ela é o caminho por onde *todo*
 * valor entra no app, do gasto ao depósito num pote.
 */
describe('digitar um valor', () => {
  it('preenche os centavos da direita pra esquerda', () => {
    expect(centsFromDigits('5')).toBe(5);
    expect(centsFromDigits('50')).toBe(50);
    expect(centsFromDigits('500')).toBe(500);
    expect(centsFromDigits('1234')).toBe(1_234);
  });

  it('não vale nada antes da primeira tecla', () => {
    expect(centsFromDigits('')).toBe(0);
  });

  it('ignora o que não é número', () => {
    // O teclado do sistema deixa passar vírgula, ponto e sinal — e colar um
    // valor formatado ("R$ 12,34") é o caso mais provável de todos.
    expect(centsFromDigits('R$ 12,34')).toBe(1_234);
    expect(centsFromDigits('-9')).toBe(9);
  });

  it('descarta zero à esquerda', () => {
    // Digitar e apagar deixa "007"; salvar 7 centavos é o certo.
    expect(centsFromDigits('007')).toBe(7);
  });

  it('para de crescer em 11 dígitos', () => {
    // Sem o corte, segurar a tecla estoura o inteiro seguro do JavaScript e o
    // valor vira outro número calado.
    const muitos = '9'.repeat(20);
    expect(centsFromDigits(muitos)).toBe(99_999_999_999);
    expect(Number.isSafeInteger(centsFromDigits(muitos))).toBe(true);
  });
});

describe('mostrar um valor', () => {
  it('escreve em real, com vírgula', () => {
    //   é o espaço fixo que o pt-BR usa depois do "R$".
    expect(formatMoney(1_234)).toBe('R$ 12,34');
    expect(formatMoney(0)).toBe('R$ 0,00');
  });

  it('põe o menos antes do símbolo, não depois', () => {
    expect(formatMoney(-1_234)).toBe('-R$ 12,34');
  });

  it('mostra o sinal dos dois lados quando pedido', () => {
    // É o extrato: entrada e saída na mesma lista precisam se distinguir.
    expect(formatMoney(1_234, { showSign: true })).toBe('+R$ 12,34');
    expect(formatMoney(-1_234, { showSign: true })).toBe('-R$ 12,34');
  });

  it('sobrevive à ida e volta pelo campo', () => {
    // O que o campo produz, a tela mostra — e o que a tela mostra, colado de
    // volta no campo, tem que dar no mesmo valor.
    const cents = 98_765;
    expect(centsFromDigits(formatMoney(cents))).toBe(cents);
  });
});

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
  /**
   * O `toLocaleString('pt-BR')` separa "R$" do número com **espaço fixo**
   * (U+00A0), não com espaço comum. Escrever o literal com o caractere de
   * verdade deixaria um teste que quebra quando alguém reescreve a linha e
   * digita um espaço normal — e o motivo seria invisível na tela. Então a
   * comparação normaliza, e quem quiser travar o caractere usa o teste logo
   * abaixo, que diz isso na cara.
   */
  const semEspacoFixo = (s: string) => s.replace(/\u00A0/g, ' ');

  it('separa o símbolo com espaço fixo, não com espaço comum', () => {
    expect(formatMoney(1_234)).toContain('\u00A0');
  });

  it('escreve em real, com vírgula', () => {
    expect(semEspacoFixo(formatMoney(1_234))).toBe('R$ 12,34');
    expect(semEspacoFixo(formatMoney(0))).toBe('R$ 0,00');
  });

  it('põe o menos antes do símbolo, não depois', () => {
    expect(semEspacoFixo(formatMoney(-1_234))).toBe('-R$ 12,34');
  });

  it('mostra o sinal dos dois lados quando pedido', () => {
    // É o extrato: entrada e saída na mesma lista precisam se distinguir.
    expect(semEspacoFixo(formatMoney(1_234, { showSign: true }))).toBe('+R$ 12,34');
    expect(semEspacoFixo(formatMoney(-1_234, { showSign: true }))).toBe('-R$ 12,34');
  });

  it('sobrevive à ida e volta pelo campo', () => {
    // O que o campo produz, a tela mostra — e o que a tela mostra, colado de
    // volta no campo, tem que dar no mesmo valor.
    const cents = 98_765;
    expect(centsFromDigits(formatMoney(cents))).toBe(cents);
  });
});

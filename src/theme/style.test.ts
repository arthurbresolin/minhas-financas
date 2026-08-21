import { alpha, contrastRatio, isLight, mix, readableOn } from '@/theme/style';
import { FALLBACK_THEMES } from '@/theme/tokens';

/**
 * As contas de cor.
 *
 * Elas sobraram da época em que o tema era uma "skin" editável, e continuam
 * valendo pelo mesmo motivo de sempre: o `accent` varia entre oito paletas, e
 * o rótulo escrito em cima dele tem que continuar legível em todas.
 */
describe('contraste', () => {
  it('vai de 1 (mesma cor) a 21 (preto no branco)', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('não depende da ordem das cores', () => {
    expect(contrastRatio('#C6F24E', '#0A0A0F')).toBeCloseTo(contrastRatio('#0A0A0F', '#C6F24E'), 5);
  });
});

describe('readableOn', () => {
  it('mantém a cor preferida quando ela já se lê', () => {
    // Preto sobre o verde-limão do tema Padrão passa folgado.
    expect(readableOn('#C6F24E', '#0A0A0F')).toBe('#0A0A0F');
  });

  it('troca a cor quando a preferida sumiria', () => {
    // Branco sobre amarelo é o caso clássico: some.
    expect(readableOn('#F5C542', '#FFFFFF')).toBe('#000000');
  });

  it('escolhe a alternativa de maior contraste', () => {
    expect(readableOn('#000000', '#111111')).toBe('#FFFFFF');
  });
});

describe('o rótulo do botão principal de cada tema', () => {
  it('se lê em todos os oito packs', () => {
    // Esta é a razão de `readableOn` existir. Um pack novo com `onAccent`
    // errado passaria despercebido até alguém abrir o app naquele tema — aqui
    // ele falha na hora.
    for (const tema of FALLBACK_THEMES) {
      const cor = readableOn(tema.accent, tema.onAccent);
      expect(contrastRatio(tema.accent, cor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lê o texto normal sobre o fundo em todos os oito packs', () => {
    for (const tema of FALLBACK_THEMES) {
      expect(contrastRatio(tema.bg, tema.text)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('alpha', () => {
  it('devolve #RRGGBBAA, que é o que o React Native aceita', () => {
    expect(alpha('#FF0000', 1)).toBe('#ff0000ff');
    expect(alpha('#FF0000', 0)).toBe('#ff000000');
  });

  it('aceita a forma curta de três dígitos', () => {
    expect(alpha('#F00', 1)).toBe('#ff0000ff');
  });

  it('prende a opacidade entre 0 e 1', () => {
    // Uma conta que estoure o intervalo geraria um canal fora de 00–ff, e a
    // cor inteira viraria inválida.
    expect(alpha('#FF0000', 5)).toBe('#ff0000ff');
    expect(alpha('#FF0000', -5)).toBe('#ff000000');
  });
});

describe('mix', () => {
  it('nas pontas devolve cada uma das cores', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#ffffff');
  });

  it('no meio fica no meio', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});

describe('isLight', () => {
  it('reconhece fundo claro e escuro', () => {
    // É isso que decide a cor do relógio do sistema: errar deixa a barra de
    // status ilegível.
    expect(isLight({ bg: '#FFFFFF' })).toBe(true);
    expect(isLight({ bg: '#0A0A0F' })).toBe(false);
  });

  it('diz que os oito packs de hoje são escuros', () => {
    // Não é uma regra do app, é o retrato do catálogo atual: se entrar um pack
    // claro, este teste falha e lembra de conferir a barra de status nele.
    for (const tema of FALLBACK_THEMES) {
      expect(isLight(tema)).toBe(false);
    }
  });
});

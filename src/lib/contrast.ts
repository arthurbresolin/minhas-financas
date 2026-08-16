/**
 * Razão de contraste WCAG entre duas cores.
 *
 * Existe porque o editor deixa escolher qualquer cor pra qualquer token, e sem
 * essa conta é questão de tempo até alguém salvar texto cinza sobre fundo cinza
 * e achar que o app quebrou. A checagem não proíbe nada — só avisa.
 */

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean.slice(0, 6);
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    // Curva do sRGB: o olho não enxerga claro/escuro de forma linear, então
    // usar o valor cru do canal daria razões erradas nos tons médios.
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Devolve algo entre 1 (invisível) e 21 (preto no branco). */
export function contrastRatio(foreground: string, background: string): number {
  const front = parseHex(foreground);
  const back = parseHex(background);
  if (!front || !back) return 21;
  const lightest = Math.max(luminance(front), luminance(back));
  const darkest = Math.min(luminance(front), luminance(back));
  return (lightest + 0.05) / (darkest + 0.05);
}

/** Mínimo do WCAG AA pra texto normal. */
export const MIN_CONTRAST = 4.5;

export function isReadable(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= MIN_CONTRAST;
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

import type { ViewStyle } from 'react-native';

import type { Density, Theme, ThemeShape } from '@/theme/tokens';

/**
 * Onde a personalidade do tema vira desenho.
 *
 * As telas não perguntam "qual tema está ativo?" nem "isso é o NOIR?". Elas
 * pedem a pele de um cartão ou de um botão e recebem o estilo pronto. Assim um
 * tema novo (ou personalizado pela pessoa) muda o app inteiro sem que nenhuma
 * tela precise ser tocada — e o mesmo cálculo alimenta a miniatura da loja.
 */

// ---------------------------------------------------------------------------
// Cor
// ---------------------------------------------------------------------------

/** Aceita #RGB, #RRGGBB e #RRGGBBAA; devolve os canais 0–255. */
function channels(hex: string): [number, number, number] {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(value.slice(0, 6), 16);
  if (Number.isNaN(int)) return [0, 0, 0];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Luminância relativa da WCAG — a mesma conta usada pelo contraste. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Um tema é claro quando o fundo é claro — é o que decide a barra de status. */
export function isLight(theme: Pick<Theme, 'bg'>): boolean {
  return luminance(theme.bg) > 0.45;
}

/** A mesma cor com opacidade, no formato #RRGGBBAA que o React Native aceita. */
export function alpha(hex: string, opacity: number): string {
  const [r, g, b] = channels(hex);
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const pad = (n: number) => n.toString(16).padStart(2, '0');
  return `#${pad(r)}${pad(g)}${pad(b)}${pad(a)}`;
}

/** Mistura duas cores. `t=0` devolve a primeira, `t=1` a segunda. */
export function mix(a: string, b: string, t: number): string {
  const [ra, ga, ba] = channels(a);
  const [rb, gb, bb] = channels(b);
  const blend = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  const pad = (n: number) => n.toString(16).padStart(2, '0');
  return `#${pad(blend(ra, rb))}${pad(blend(ga, gb))}${pad(blend(ba, bb))}`;
}

/**
 * Uma cor que sempre se lê sobre o fundo dado.
 *
 * Serve pra rótulo em cima de cor escolhida pela pessoa: sem isso, um accent
 * claro com `onAccent` branco some. Nunca deixa texto ilegível, mesmo com uma
 * combinação que a personalização permitiu.
 */
export function readableOn(background: string, preferred: string, fallbacks: string[] = ['#FFFFFF', '#000000']): string {
  if (contrastRatio(background, preferred) >= 4.5) return preferred;
  const sorted = [...fallbacks].sort(
    (a, b) => contrastRatio(background, b) - contrastRatio(background, a),
  );
  return sorted[0] ?? preferred;
}

// ---------------------------------------------------------------------------
// Espaço e forma
// ---------------------------------------------------------------------------

const DENSITY_SCALE: Record<Density, number> = { compact: 0.8, regular: 1, roomy: 1.22 };
const SHAPE_SCALE: Record<ThemeShape, number> = { sharp: 0.25, medium: 0.7, round: 1 };

/** Espaço entre blocos, esticado ou apertado pela densidade do tema. */
export function space(theme: Theme, base: number): number {
  return Math.round(base * DENSITY_SCALE[theme.density]);
}

/**
 * O raio de um elemento.
 *
 * `radius` é o raio dos cartões; `shape` é o quanto o tema arredonda em geral.
 * Multiplicar os dois deixa um tema "sharp" reto até em cima de um radius alto
 * herdado, que é o que a personalização precisa pra mudar de forma num toque.
 */
export function radiusFor(theme: Theme, base: number = theme.radius): number {
  return Math.round(base * SHAPE_SCALE[theme.shape]);
}

/** Raio de pílula: `sharp` vira caixa, os outros arredondam de verdade. */
export function pillRadius(theme: Theme, height: number): number {
  return theme.shape === 'sharp' ? radiusFor(theme, 10) : height / 2;
}

// ---------------------------------------------------------------------------
// Peles
// ---------------------------------------------------------------------------

/** A pele de um cartão, conforme `cardStyle`. */
export function cardSkin(
  theme: Theme,
  { alt = false, destaque = false }: { alt?: boolean; destaque?: boolean } = {},
): ViewStyle {
  const base = alt ? theme.surfaceAlt : theme.surface;
  const radius = radiusFor(theme);

  switch (theme.cardStyle) {
    case 'outline':
      // Editorial: o cartão é o traço, não a superfície. O destaque engrossa.
      return {
        backgroundColor: theme.bg,
        borderRadius: radius,
        borderWidth: destaque ? 2 : 1,
        borderColor: destaque ? theme.accent : theme.border,
      };
    case 'line':
      // Fio fino sobre o fundo: o desenho digital, sem bloco de superfície.
      return {
        backgroundColor: destaque ? alpha(theme.accent, 0.07) : 'transparent',
        borderRadius: radius,
        borderWidth: 1,
        borderColor: destaque ? alpha(theme.accent, 0.5) : theme.border,
      };
    case 'glass':
      // Vidro: superfície translúcida e borda mais clara que ela.
      return {
        backgroundColor: alpha(base, 0.72),
        borderRadius: radius,
        borderWidth: 1,
        borderColor: destaque ? alpha(theme.accent, 0.35) : alpha(theme.border, 0.8),
      };
    case 'filled':
    default:
      return {
        backgroundColor: base,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: destaque ? theme.accent : theme.border,
      };
  }
}

export type ButtonTone = 'primary' | 'ghost' | 'danger';

export type ButtonSkin = {
  container: ViewStyle;
  /** Sombra seca atrás (só no adesivo); `null` quando o tema não usa. */
  shadow: ViewStyle | null;
  /** Deslocamento ao apertar — o adesivo "senta" na própria sombra. */
  pressOffset: number;
  foreground: string;
  radius: number;
};

/** A pele de um botão, conforme `buttonStyle`. */
export function buttonSkin(theme: Theme, tone: ButtonTone, height = 50): ButtonSkin {
  const radius = pillRadius(theme, height);
  const isPrimary = tone === 'primary';
  const accent = tone === 'danger' ? theme.negative : theme.accent;
  const onAccent = tone === 'danger' ? readableOn(theme.negative, theme.onAccent) : readableOn(theme.accent, theme.onAccent);

  const base: ButtonSkin = {
    container: { borderRadius: radius, borderWidth: 1, borderColor: theme.border },
    shadow: null,
    pressOffset: 0,
    foreground: tone === 'danger' ? theme.negative : theme.text,
    radius,
  };

  switch (theme.buttonStyle) {
    case 'sticker':
      // Adesivo colado: contorno grosso e sombra dura deslocada. Fundo sempre
      // opaco — com sombra atrás, transparente deixaria ela vazar por dentro.
      return {
        ...base,
        container: {
          borderRadius: radius,
          borderWidth: 2,
          borderColor: accent,
          backgroundColor: isPrimary ? accent : theme.bg,
        },
        shadow: { borderRadius: radius, backgroundColor: theme.border },
        pressOffset: 3,
        foreground: isPrimary ? onAccent : tone === 'danger' ? theme.negative : theme.text,
      };
    case 'outline':
      return {
        ...base,
        container: {
          borderRadius: radius,
          borderWidth: isPrimary ? 2 : 1,
          borderColor: accent,
          backgroundColor: 'transparent',
        },
        foreground: accent,
      };
    case 'glow':
      // Luminoso: o brilho é a própria cor sangrando pra fora, feito com a
      // sombra do sistema (aqui ela *deve* ser borrada).
      return {
        ...base,
        container: {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: isPrimary ? accent : alpha(accent, 0.45),
          backgroundColor: isPrimary ? accent : alpha(accent, 0.12),
          shadowColor: accent,
          shadowOpacity: 0.55,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
        foreground: isPrimary ? onAccent : accent,
      };
    case 'solid':
    default:
      return {
        ...base,
        container: {
          borderRadius: radius,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: tone === 'danger' ? theme.negative : theme.border,
          backgroundColor: isPrimary ? accent : 'transparent',
        },
        foreground: isPrimary ? onAccent : tone === 'danger' ? theme.negative : theme.text,
      };
  }
}

/** A pele de um item selecionável (categoria, tecla, aba) — usada bastante. */
export function chipSkin(theme: Theme, active: boolean): ViewStyle {
  const radius = radiusFor(theme, 14);
  if (!active) {
    return theme.cardStyle === 'line' || theme.cardStyle === 'outline'
      ? { backgroundColor: 'transparent', borderRadius: radius, borderWidth: 1, borderColor: theme.border }
      : { backgroundColor: theme.surface, borderRadius: radius, borderWidth: 1, borderColor: theme.border };
  }
  return theme.buttonStyle === 'glow'
    ? {
        backgroundColor: alpha(theme.accent, 0.18),
        borderRadius: radius,
        borderWidth: 1,
        borderColor: theme.accent,
      }
    : { backgroundColor: theme.accent, borderRadius: radius, borderWidth: 1, borderColor: theme.accent };
}

/** A cor do texto dentro de um chip — acompanha a pele acima. */
export function chipForeground(theme: Theme, active: boolean): string {
  if (!active) return theme.text;
  return theme.buttonStyle === 'glow' ? theme.accent : readableOn(theme.accent, theme.onAccent);
}

import type { ViewStyle } from 'react-native';

import { RADIUS, type Theme } from '@/theme/tokens';

/**
 * As cores do tema viram desenho aqui.
 *
 * Antes este arquivo tinha um `switch` por eixo de personalidade: quatro peles
 * de cartão, quatro de botão, três densidades, três formas. O app tem *um*
 * desenho agora — o que muda entre temas é a cor que entra nele. As contas de
 * cor continuam aqui porque um accent escolhido pela pessoa ainda precisa
 * render texto legível.
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
 * Serve pra rótulo em cima de cor de tema: sem isso, um accent claro com
 * `onAccent` branco some. Continua valendo mesmo com o tema reduzido a cores —
 * é justamente a cor que ficou livre pra variar.
 */
export function readableOn(background: string, preferred: string, fallbacks: string[] = ['#FFFFFF', '#000000']): string {
  if (contrastRatio(background, preferred) >= 4.5) return preferred;
  const sorted = [...fallbacks].sort(
    (a, b) => contrastRatio(background, b) - contrastRatio(background, a),
  );
  return sorted[0] ?? preferred;
}

// ---------------------------------------------------------------------------
// Peles
// ---------------------------------------------------------------------------

/** A pele de um cartão: superfície, borda fina, raio único. */
export function cardSkin(
  theme: Theme,
  { alt = false, destaque = false }: { alt?: boolean; destaque?: boolean } = {},
): ViewStyle {
  return {
    backgroundColor: alt ? theme.surfaceAlt : theme.surface,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: destaque ? theme.accent : theme.border,
  };
}

export type ButtonTone = 'primary' | 'ghost' | 'danger';

export type ButtonSkin = {
  container: ViewStyle;
  foreground: string;
  radius: number;
};

/** A pele de um botão: chapado no accent, ou contornado quando é secundário. */
export function buttonSkin(theme: Theme, tone: ButtonTone, height = 50): ButtonSkin {
  const radius = height / 2;
  const isPrimary = tone === 'primary';
  const accent = tone === 'danger' ? theme.negative : theme.accent;

  return {
    container: {
      borderRadius: radius,
      borderWidth: isPrimary ? 0 : 1,
      borderColor: tone === 'danger' ? theme.negative : theme.border,
      backgroundColor: isPrimary ? accent : 'transparent',
    },
    foreground: isPrimary
      ? readableOn(accent, theme.onAccent)
      : tone === 'danger'
        ? theme.negative
        : theme.text,
    radius,
  };
}

/** A pele de um item selecionável (categoria, aba, período). */
export function chipSkin(theme: Theme, active: boolean): ViewStyle {
  return {
    backgroundColor: active ? theme.accent : theme.surface,
    borderRadius: RADIUS - 2,
    borderWidth: 1,
    borderColor: active ? theme.accent : theme.border,
  };
}

/** A cor do texto dentro de um chip — acompanha a pele acima. */
export function chipForeground(theme: Theme, active: boolean): string {
  return active ? readableOn(theme.accent, theme.onAccent) : theme.text;
}

/** A sombra que dá volume a um cartão de destaque. */
export function depthShadow(theme: Theme, strength: 'soft' | 'strong' = 'soft'): ViewStyle {
  const forte = strength === 'strong';
  return {
    shadowColor: '#000000',
    shadowOpacity: isLight(theme) ? (forte ? 0.14 : 0.09) : forte ? 0.5 : 0.35,
    shadowRadius: forte ? 26 : 16,
    shadowOffset: { width: 0, height: forte ? 14 : 8 },
    elevation: forte ? 10 : 5,
  };
}

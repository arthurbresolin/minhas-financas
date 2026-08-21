import { Text, type TextProps, type TextStyle } from 'react-native';

import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'mono' | 'condensed' | 'numeric' | 'hand';

/**
 * As variantes de texto.
 *
 * As fontes são fixas: elas são a assinatura do app, a parte que não muda
 * quando a pessoa troca de tema. O tema muda a cor do texto, não a família.
 */
const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: FONTS.display, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
  mono: { fontFamily: FONTS.mono, fontSize: 16, lineHeight: 24 },
  condensed: { fontFamily: FONTS.condensed, fontSize: 26, lineHeight: 32, letterSpacing: -1 },
  numeric: { fontFamily: FONTS.numeric, fontSize: 38, lineHeight: 42, letterSpacing: 0.5 },
  hand: { fontFamily: FONTS.hand, fontSize: 16, lineHeight: 20 },
};

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  color?: string;
  size?: number;
};

export function AppText({ variant = 'body', muted, color, size, style, ...rest }: Props) {
  const theme = useTheme();
  const base = VARIANTS[variant];
  // Toda variante define lineHeight junto do fontSize. Trocar só o tamanho por
  // fora cortaria emoji e acento no topo — por isso `size` recalcula os dois.
  // O espaçamento entre letras também acompanha: a condensada usa um valor
  // negativo calibrado pro tamanho grande, e mantê-lo fixo grudaria as palavras
  // quando o texto encolhe.
  const scaled = size
    ? {
        fontSize: size,
        lineHeight: Math.round(size * 1.35),
        ...(base.letterSpacing && base.fontSize
          ? { letterSpacing: (base.letterSpacing / base.fontSize) * size }
          : null),
      }
    : null;

  return (
    <Text
      style={[base, scaled, { color: color ?? (muted ? theme.textMuted : theme.text) }, style]}
      {...rest}
    />
  );
}

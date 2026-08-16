import { Text, type TextProps, type TextStyle } from 'react-native';

import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'mono' | 'condensed' | 'numeric' | 'hand';

/**
 * As variantes montadas com as fontes do tema.
 *
 * Isso é uma função, não uma constante, porque as famílias vêm do tema.
 *
 * `condensed` é o título gritado das telas — e é justamente onde a diferença
 * entre um tema e outro mais aparece, então ele usa a fonte de display do tema
 * em vez de uma fixa. `numeric` e `hand` continuam fixas: o número do saldo em
 * Anton e o bilhetinho manuscrito são a assinatura do app, a parte que não
 * muda quando a pessoa troca de pele.
 */
function variantsFor(display: string, mono: string, sans: string): Record<Variant, TextStyle> {
  return {
    display: { fontFamily: display, fontSize: 28, lineHeight: 36 },
    title: { fontFamily: display, fontSize: 18, lineHeight: 26 },
    body: { fontFamily: sans, fontSize: 15, lineHeight: 22 },
    label: { fontFamily: sans, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
    mono: { fontFamily: mono, fontSize: 16, lineHeight: 24 },
    condensed: { fontFamily: display, fontSize: 26, lineHeight: 32, letterSpacing: -1 },
    numeric: { fontFamily: FONTS.numeric, fontSize: 38, lineHeight: 42, letterSpacing: 0.5 },
    hand: { fontFamily: FONTS.hand, fontSize: 16, lineHeight: 20 },
  };
}

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  color?: string;
  size?: number;
};

export function AppText({ variant = 'body', muted, color, size, style, ...rest }: Props) {
  const theme = useTheme();
  const base = variantsFor(theme.fontDisplay, theme.fontMono, theme.fontSans)[variant];
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

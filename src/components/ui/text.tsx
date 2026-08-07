import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { FONTS } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'body' | 'label' | 'mono';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: FONTS.display, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
  mono: { fontFamily: FONTS.mono, fontSize: 16, lineHeight: 24 },
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
  const scaled = size ? { fontSize: size, lineHeight: Math.round(size * 1.35) } : null;

  return (
    <Text
      style={[base, scaled, { color: color ?? (muted ? theme.textMuted : theme.text) }, style]}
      {...rest}
    />
  );
}

import { View, type ViewProps } from 'react-native';

import { cardSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = ViewProps & {
  alt?: boolean;
  padded?: boolean;
  /** Cartão em destaque: a borda vira o accent do tema. */
  destaque?: boolean;
};

/** Um cartão: superfície do tema, borda fina, raio único. */
export function Card({ alt, padded = true, destaque, style, ...rest }: Props) {
  const theme = useTheme();

  return <View style={[cardSkin(theme, { alt, destaque }), padded ? { padding: 16 } : null, style]} {...rest} />;
}

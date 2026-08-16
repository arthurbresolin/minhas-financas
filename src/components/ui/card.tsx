import { View, type ViewProps } from 'react-native';

import { cardSkin, space } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = ViewProps & {
  alt?: boolean;
  padded?: boolean;
  /** Cartão em destaque: ganha o traço, o brilho ou a borda do tema ativo. */
  destaque?: boolean;
};

/**
 * O cartão não tem um desenho só.
 *
 * Chapado, de contorno, de vidro ou só um fio: quem decide é o `cardStyle` do
 * tema, resolvido em `cardSkin`. Este componente não sabe qual tema está ativo
 * — só pede a pele e aplica.
 */
export function Card({ alt, padded = true, destaque, style, ...rest }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[cardSkin(theme, { alt, destaque }), padded ? { padding: space(theme, 16) } : null, style]}
      {...rest}
    />
  );
}

import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/text';
import { buttonSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
};

const HEIGHT = 50;

/**
 * O botão do app.
 *
 * Um desenho só: chapado no accent quando é o principal, contornado quando não
 * é. As variações de adesivo, contorno e luminoso saíram junto com os eixos de
 * personalidade do tema — o que muda entre temas é a cor que entra aqui.
 */
export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const skin = buttonSkin(theme, variant, HEIGHT);

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        skin.container,
        {
          paddingVertical: 15,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={skin.foreground} />
      ) : (
        <AppText variant="title" size={15} color={skin.foreground}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

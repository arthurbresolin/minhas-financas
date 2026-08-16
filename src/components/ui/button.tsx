import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/text';
import { buttonSkin, space } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
};

const HEIGHT = 50;

/**
 * Chapado, adesivo, de contorno ou luminoso — o desenho vem do tema.
 *
 * O único caso que exige estrutura extra é o adesivo: a sombra dura precisa ser
 * uma View *irmã* do botão, porque em React Native todo filho pinta por cima do
 * fundo do pai e uma sombra "atrás" dentro do botão apagaria o preenchimento.
 */
export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const skin = buttonSkin(theme, variant, HEIGHT);

  return (
    <View style={[{ borderRadius: skin.radius }, style]}>
      {skin.shadow && !disabled ? (
        <View style={[{ position: 'absolute', left: 3, top: 3, right: -3, bottom: -3 }, skin.shadow]} />
      ) : null}
      <Pressable
        disabled={disabled || loading}
        style={({ pressed }) => [
          skin.container,
          {
            paddingVertical: space(theme, 15),
            paddingHorizontal: space(theme, 20),
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.45 : pressed && !skin.pressOffset ? 0.8 : 1,
            transform: skin.pressOffset
              ? [
                  { translateX: pressed ? skin.pressOffset : 0 },
                  { translateY: pressed ? skin.pressOffset : 0 },
                ]
              : undefined,
          },
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
    </View>
  );
}

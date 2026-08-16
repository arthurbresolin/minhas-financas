import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/text';
import { buttonSkin } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = {
  label: string;
  onPress?: () => void;
  /** `cheio` inverte as cores — é o botão principal da tela. */
  variant?: 'cheio' | 'contorno';
  height?: number;
  style?: ViewStyle;
};

/**
 * O botão compacto das telas.
 *
 * Mesma pele do `Button`, só que baixinho e sem crescer: o que muda entre um
 * tema e outro (adesivo, brilho, traço) já vem resolvido pelo `buttonSkin`.
 */
export function Pill({ label, onPress, variant = 'contorno', height = 44, style }: Props) {
  const theme = useTheme();
  const skin = buttonSkin(theme, variant === 'cheio' ? 'primary' : 'ghost', height);

  return (
    // A sombra do adesivo é irmã do botão, não filha: em React Native todo
    // filho pinta por cima do fundo do pai, então uma sombra "atrás" dentro do
    // botão apagaria o preenchimento dele — `zIndex` negativo não resolve isso.
    <View style={[{ height }, style]}>
      {skin.shadow ? (
        <View style={[{ position: 'absolute', left: 3, top: 3, right: -3, bottom: -3 }, skin.shadow]} />
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          skin.container,
          {
            height,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
            opacity: pressed && !skin.pressOffset ? 0.8 : 1,
            transform: skin.pressOffset
              ? [
                  { translateX: pressed ? skin.pressOffset : 0 },
                  { translateY: pressed ? skin.pressOffset : 0 },
                ]
              : undefined,
          },
        ]}
      >
        <AppText variant="title" size={14} color={skin.foreground} numberOfLines={1}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/text';

type Props = {
  /** Linha pequena por cima, em caixa alta. */
  chapeu?: string;
  titulo: string;
  /** Mostra a seta de voltar à esquerda. */
  voltar?: boolean;
};

/**
 * Cabeçalho padrão das telas no visual NG.cash: chapéu miúdo em caixa alta e o
 * título em condensada itálica. Fica num componente só porque o título aparece
 * em cinco telas — e é ele que carrega o "sotaque" do design.
 */
export function Titulo({ chapeu, titulo, voltar }: Props) {
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {voltar ? (
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText size={20}>←</AppText>
        </Pressable>
      ) : null}
      <View style={{ flexShrink: 1 }}>
        {chapeu ? (
          <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
            {chapeu}
          </AppText>
        ) : null}
        <AppText variant="condensed" size={22} numberOfLines={1}>
          {titulo.toUpperCase()}
        </AppText>
      </View>
    </View>
  );
}

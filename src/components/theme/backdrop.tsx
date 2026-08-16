import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Grid3D } from '@/components/ng/grid-3d';
import { alpha } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/**
 * O tratamento de fundo do tema ativo.
 *
 * Nenhuma tela escolhe o próprio fundo: o `Screen` desenha isto, e o
 * `backgroundStyle` decide. É o que faz um tema ser um ambiente e não uma
 * paleta — o grid em perspectiva do DIGITAL e o cromado do Y2K não são
 * decoração de uma tela, são o chão do app inteiro.
 *
 * Sempre `pointerEvents="none"`: fundo nenhum pode roubar toque do conteúdo.
 */
export function Backdrop() {
  const theme = useTheme();

  if (theme.backgroundStyle === 'plain') return null;

  if (theme.backgroundStyle === 'grid') {
    return <Grid3D color={theme.text} />;
  }

  if (theme.backgroundStyle === 'glow') {
    // Sem gradiente radial em React Native, o brilho é feito de duas manchas
    // lineares em cantos opostos — de longe lê igual.
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={[alpha(theme.accent, 0.28), alpha(theme.accent, 0)]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', top: -80, left: -60, width: 340, height: 340, borderRadius: 170 }}
        />
        <LinearGradient
          colors={[alpha(theme.accentAlt, 0.22), alpha(theme.accentAlt, 0)]}
          start={{ x: 0.9, y: 1 }}
          end={{ x: 0.1, y: 0 }}
          style={{ position: 'absolute', bottom: -60, right: -70, width: 300, height: 300, borderRadius: 150 }}
        />
      </View>
    );
  }

  // `gradient`: o cromado. Uma faixa clara atravessando o fundo, como reflexo
  // em metal escovado.
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[alpha(theme.surfaceAlt, 0.9), theme.bg, alpha(theme.surface, 0.85), theme.bg]}
      locations={[0, 0.35, 0.62, 1]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

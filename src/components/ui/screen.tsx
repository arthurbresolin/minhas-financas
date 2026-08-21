import type { ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /**
   * Reserva o espaço da barra de abas flutuante no rodapé.
   *
   * Só as telas *dentro* das abas precisam disso. Numa tela empilhada não há
   * barra nenhuma embaixo, e os 90px viram um buraco que empurra o botão
   * principal pra longe do polegar.
   */
  tabBar?: boolean;
};

/**
 * A moldura de toda tela: margem, rolagem e o fundo do tema.
 *
 * O fundo era um componente à parte que desenhava grid em perspectiva, manchas
 * de luz ou gradiente conforme o tema. Agora é o que sempre deveria ter sido:
 * a cor de fundo do tema ativo.
 */
export function Screen({ children, scroll = true, refreshControl, tabBar = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + 12,
    // 90 dá folga pra barra de abas flutuante não cobrir o último item da lista.
    paddingBottom: insets.bottom + (tabBar ? 90 : 12),
    paddingHorizontal: 18,
  };

  const content = !scroll ? (
    <View style={[{ flex: 1 }, padding]}>{children}</View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padding, { gap: 16 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );

  return <View style={{ flex: 1, backgroundColor: theme.bg }}>{content}</View>;
}

import type { ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/theme/backdrop';
import { space } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({ children, scroll = true, refreshControl }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // A densidade do tema respira aqui primeiro: é a margem da tela que faz o
  // app parecer apertado ou arejado, antes de qualquer cartão.
  const padding = {
    paddingTop: insets.top + space(theme, 12),
    // 90 dá folga pra barra de abas flutuante não cobrir o último item da lista.
    paddingBottom: insets.bottom + 90,
    paddingHorizontal: space(theme, 18),
  };

  const content = !scroll ? (
    <View style={[{ flex: 1 }, padding]}>{children}</View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padding, { gap: space(theme, 16) }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );

  // O fundo é irmão do conteúdo, não filho do ScrollView: assim o desenho fica
  // ancorado na tela em vez de subir junto com a rolagem. Quem escolhe qual
  // desenho é o tema, não a tela — por isso nenhuma tela passa fundo por fora.
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Backdrop />
      {content}
    </View>
  );
}

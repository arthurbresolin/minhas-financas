import type { ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({ children, scroll = true, refreshControl }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + 12,
    // 90 dá folga pra barra de abas flutuante não cobrir o último item da lista.
    paddingBottom: insets.bottom + 90,
    paddingHorizontal: 18,
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: theme.bg }, padding]}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[padding, { gap: 16 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

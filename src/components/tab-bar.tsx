import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { useTheme } from '@/theme/use-theme';

const ICONS: Record<string, string> = {
  index: '◎',
  transacoes: '≡',
  perfil: '☺',
};

const LABELS: Record<string, string> = {
  index: 'Início',
  transacoes: 'Extrato',
  perfil: 'Perfil',
};

/**
 * Barra flutuante com o botão de lançar gasto no meio.
 *
 * O "+" fica grande, no centro e sempre visível de propósito: registrar é a
 * ação que a pessoa faz várias vezes por dia, e todo app de finanças morre
 * quando registrar dá trabalho. Ele não é uma aba — abre o modal por cima.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: insets.bottom + 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 26,
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ alignItems: 'center', gap: 2, minWidth: 62, paddingVertical: 4 }}
          >
            <AppText size={19} color={focused ? theme.accent : theme.textMuted}>
              {ICONS[route.name] ?? '•'}
            </AppText>
            <AppText variant="label" size={10} color={focused ? theme.accent : theme.textMuted}>
              {LABELS[route.name] ?? route.name}
            </AppText>
          </Pressable>
        );

        // O botão de lançar entra no meio da lista de abas, entre a primeira
        // metade e a segunda.
        if (index === Math.floor(state.routes.length / 2)) {
          return [
            <Pressable
              key="lancar"
              accessibilityLabel="Lançar gasto"
              onPress={() => router.push('/nova-transacao')}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText size={26} color={theme.onAccent} style={{ marginTop: -2 }}>
                +
              </AppText>
            </Pressable>,
            tab,
          ];
        }
        return tab;
      })}
    </View>
  );
}

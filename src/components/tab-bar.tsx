import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { readableOn } from '@/theme/style';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Um ícone por destino, um desenho só.
 *
 * Antes eram quatro conjuntos (traço, geométrico, pixel, rabisco) escolhidos
 * pelo tema. São caracteres porque saem alinhados com a fonte de graça — e o
 * que muda entre temas é a cor deles.
 */
const GLYPHS: Record<string, string> = {
  index: '◈',
  transacoes: '≡',
  metas: '◎',
  perfil: '☺',
};

// Minúsculas de propósito: é o tom do design, que fala com a pessoa em vez de
// rotular a interface.
const LABELS: Record<string, string> = {
  index: 'carteira',
  transacoes: 'extrato',
  metas: 'metas',
  perfil: 'você',
};

/**
 * Barra com o botão de lançar no meio.
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        left: 18,
        right: 18,
        bottom: insets.bottom + 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 26,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? theme.accent : theme.textMuted;
        const tab = (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ alignItems: 'center', gap: 2, minWidth: 52, paddingVertical: 4 }}
          >
            <AppText size={19} color={color}>
              {GLYPHS[route.name] ?? '•'}
            </AppText>
            <AppText variant="label" size={9} color={color}>
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
                borderRadius: RADIUS + 10,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText size={26} color={readableOn(theme.accent, theme.onAccent)} style={{ marginTop: -2 }}>
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

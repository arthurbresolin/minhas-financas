import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Doodle, type DoodleName } from '@/components/ng/doodle';
import { AppText } from '@/components/ui/text';
import { alpha, radiusFor, readableOn } from '@/theme/style';
import type { IconStyle, Theme } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * O mesmo destino desenhado de quatro jeitos.
 *
 * Um ícone é personalidade: o traço solto do CHERRY e o bloco do Y2K não são a
 * mesma barra repintada. Os três primeiros conjuntos são caracteres (baratos e
 * sempre alinhados com a fonte do tema); o `doodle` é desenho em SVG.
 */
const GLYPHS: Record<Exclude<IconStyle, 'doodle'>, Record<string, string>> = {
  glyph: { index: '◈', transacoes: '≡', perfil: '☺' },
  geometric: { index: '◆', transacoes: '▤', perfil: '●' },
  pixel: { index: '▣', transacoes: '▤', perfil: '☻' },
};

const DOODLES: Record<string, DoodleName> = {
  index: 'cofrinho',
  transacoes: 'viagem',
  perfil: 'olhos',
};

// Minúsculas de propósito: é o tom do design, que fala com a pessoa em vez de
// rotular a interface.
const LABELS: Record<string, string> = {
  index: 'carteira',
  transacoes: 'extrato',
  perfil: 'perfil',
};

/** A forma da barra: flutuante, encostada embaixo ou nenhuma. */
function barSkin(theme: Theme, bottomInset: number): ViewStyle {
  switch (theme.navStyle) {
    case 'dock':
      // Encostada no rodapé: sem margem lateral, só um fio em cima. É o que dá
      // o ar de aparelho, de painel, em vez de cartão solto.
      return {
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: bottomInset + 8,
        paddingTop: 10,
        paddingHorizontal: 18,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderColor: theme.border,
      };
    case 'minimal':
      // Sem caixa: os ícones pairam sobre o conteúdo. Some quase por completo.
      return {
        left: 18,
        right: 18,
        bottom: bottomInset + 10,
        paddingVertical: 6,
        backgroundColor: 'transparent',
      };
    case 'floating':
    default:
      return {
        left: 18,
        right: 18,
        bottom: bottomInset + 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor:
          theme.cardStyle === 'glass' ? alpha(theme.surface, 0.85) : theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: Math.max(radiusFor(theme, 26), 12),
      };
  }
}

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
  const glow = theme.buttonStyle === 'glow';

  return (
    <View
      style={[
        { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        barSkin(theme, insets.bottom),
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? theme.text : theme.textMuted;
        const tab = (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ alignItems: 'center', gap: 2, minWidth: 62, paddingVertical: 4 }}
          >
            {theme.iconStyle === 'doodle' ? (
              <Doodle name={DOODLES[route.name] ?? 'brilho'} color={color} size={22} strokeWidth={2.2} />
            ) : (
              <AppText size={19} color={color}>
                {GLYPHS[theme.iconStyle][route.name] ?? '•'}
              </AppText>
            )}
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
                // O "+" segue a forma do tema: círculo, ou quadrado nos secos.
                borderRadius: theme.shape === 'sharp' ? radiusFor(theme, 12) : 26,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                ...(glow
                  ? {
                      shadowColor: theme.accent,
                      shadowOpacity: 0.7,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 8,
                    }
                  : null),
              }}
            >
              <AppText
                size={26}
                color={readableOn(theme.accent, theme.onAccent)}
                style={{ marginTop: -2 }}
              >
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

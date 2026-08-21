import * as Haptics from 'expo-haptics';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Titulo } from '@/components/ng/titulo';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { RADIUS, type Theme } from '@/theme/tokens';
import { useThemePicker } from '@/theme/use-theme';

const GAP = 12;
const PADDING = 18;

/**
 * A lista de temas.
 *
 * Cada célula é a paleta em si: as cores do tema, do fundo ao destaque. Antes
 * aqui havia uma miniatura que redesenhava a interface inteira em cada tema,
 * mais um editor de cor por token — mas o tema virou paleta, e uma paleta se
 * mostra mostrando as cores.
 *
 * O toque veste na hora: a própria tela repintando é a pré-visualização, e
 * pedir "salvar" aqui só atrapalharia.
 */
export default function TemasScreen() {
  const { active, themes, setTheme } = useThemePicker();
  const { width } = useWindowDimensions();

  const cellWidth = Math.floor((width - PADDING * 2 - GAP) / 2);

  function vestir(item: Theme) {
    if (item.id === active.id) return;
    // Um tema é uma troca de roupa do app: o toque merece peso físico.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(item.id);
  }

  return (
    <Screen>
      <Titulo chapeu="toque pra vestir" titulo="aparência" voltar />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {themes.map((item) => {
          const selected = item.id === active.id;
          return (
            <Pressable
              key={String(item.id)}
              onPress={() => vestir(item)}
              style={({ pressed }) => ({
                width: cellWidth,
                gap: 6,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View
                style={{
                  // O anel de selecionado fica *fora* da amostra, com folga:
                  // por dentro ele viraria só mais uma cor da paleta.
                  padding: 3,
                  borderRadius: RADIUS + 3,
                  borderWidth: 2,
                  borderColor: selected ? active.accent : 'transparent',
                }}
              >
                <View
                  style={{
                    height: 96,
                    borderRadius: RADIUS,
                    borderWidth: 1,
                    borderColor: item.border,
                    backgroundColor: item.bg,
                    padding: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Uma linha de superfície e uma fileira de bolinhas: é a
                      paleta inteira do tema numa olhada. */}
                  <View
                    style={{
                      height: 26,
                      borderRadius: RADIUS - 6,
                      backgroundColor: item.surface,
                      borderWidth: 1,
                      borderColor: item.border,
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[item.accent, item.accentAlt, item.positive, item.negative].map((cor, i) => (
                      <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: cor }} />
                    ))}
                  </View>
                </View>
              </View>

              <AppText variant="title" size={13} numberOfLines={1} style={{ paddingHorizontal: 3 }}>
                {item.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="hand" muted size={14} style={{ textAlign: 'center' }}>
        o tema muda as cores do app inteiro
      </AppText>
    </Screen>
  );
}

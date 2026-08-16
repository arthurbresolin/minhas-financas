import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, useWindowDimensions, View } from 'react-native';

import { deleteTheme, duplicateTheme } from '@/api';
import { Titulo } from '@/components/ng/titulo';
import { ThemePreview } from '@/components/theme/theme-preview';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radiusFor } from '@/theme/style';
import type { Theme } from '@/theme/tokens';
import { useThemePicker } from '@/theme/use-theme';

const GAP = 12;
const PADDING = 18;

/**
 * A loja de temas.
 *
 * Uma grade de miniaturas, não uma lista de linhas com nome e botão: a pessoa
 * não está escolhendo cor de borda, está escolhendo com que cara o app dela vai
 * ficar. Por isso cada célula mostra a interface de verdade naquele tema, e o
 * toque veste na hora — a própria tela repintando é a pré-visualização, e pedir
 * "salvar" aqui só atrapalharia.
 */
export default function TemasScreen() {
  const router = useRouter();
  const { active, themes, setTheme, reload } = useThemePicker();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);

  const cellWidth = Math.floor((width - PADDING * 2 - GAP) / 2);

  function vestir(item: Theme) {
    if (item.id === active.id) return;
    // Um tema é uma troca de roupa do app: o toque merece peso físico.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(item.id);
  }

  /**
   * O caminho único pra personalização.
   *
   * Preset é só leitura — mexer nele tiraria da pessoa o ponto de partida pra
   * onde voltar quando o tema dela ficar ilegível. Então personalizar um preset
   * é, na verdade, duplicar e editar a cópia; o editor só recebe temas dela.
   */
  async function personalizar(item: Theme) {
    if (typeof item.id !== 'number' || busy) return;
    if (!item.isPreset) {
      router.push({ pathname: '/tema-editor', params: { id: String(item.id) } });
      return;
    }
    setBusy(true);
    try {
      const copy = await duplicateTheme(item.id);
      await reload();
      setTheme(copy.id);
      router.push({ pathname: '/tema-editor', params: { id: String(copy.id) } });
    } catch {
      Alert.alert('Não deu pra personalizar', 'Verifique a conexão e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function apagar(item: Theme) {
    if (typeof item.id !== 'number' || item.isPreset) return;
    Alert.alert('Apagar tema?', `"${item.name}" some pra sempre.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await deleteTheme(item.id as number);
          await reload();
        },
      },
    ]);
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
              onLongPress={() => apagar(item)}
              style={({ pressed }) => ({
                width: cellWidth,
                gap: 6,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View
                style={{
                  // O anel de selecionado fica *fora* da miniatura, com folga:
                  // por dentro ele viraria parte do desenho do tema e a pessoa
                  // leria como borda do pack, não como escolha dela.
                  padding: 3,
                  borderRadius: Math.max(radiusFor(active, 20), 9) + 3,
                  borderWidth: 2,
                  borderColor: selected ? active.accent : 'transparent',
                }}
              >
                <ThemePreview theme={item} width={cellWidth - 6} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 3 }}>
                <AppText variant="title" size={13} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {item.name}
                </AppText>
                {item.vibe ? (
                  <AppText variant="hand" size={13} muted numberOfLines={1}>
                    {item.vibe}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* A personalização é discreta de propósito: quem entra em "aparência"
          quer trocar de pele, não abrir um painel de configuração. */}
      <Pressable
        onPress={() => void personalizar(active)}
        style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 }}
      >
        <AppText variant="label" size={12} color={active.accent} style={{ textTransform: 'uppercase' }}>
          {busy ? 'abrindo…' : `personalizar ${active.name}`}
        </AppText>
      </Pressable>

      <AppText variant="hand" muted size={14} style={{ textAlign: 'center' }}>
        segure um tema seu pra apagar
      </AppText>
    </Screen>
  );
}

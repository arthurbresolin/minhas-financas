import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rise } from '@/components/ui/motion';
import { AppText } from '@/components/ui/text';
import { alpha, depthShadow } from '@/theme/style';
import { useTheme } from '@/theme/use-theme';

/**
 * A gaveta que sobe de baixo.
 *
 * É o gesto do desenho novo: em vez de abrir outra tela pra guardar R$ 50 num
 * pote, a tela continua ali atrás, escurecida, e a decisão acontece por cima.
 * Menos navegação pra uma ação de dois toques.
 *
 * Fecha tocando no escuro e pelo botão do sistema (o `onRequestClose` do
 * Modal) — nunca só por um "✕" desenhado, que é o jeito de prender alguém numa
 * gaveta em aparelho com gesto de voltar.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const radius = 26;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha('#000000', 0.55) }} onPress={onClose} />
        <Rise>
          <View
            style={[
              depthShadow(theme, 'strong'),
              {
                backgroundColor: theme.surface,
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: insets.bottom + 20,
                // Em pixels: uma porcentagem aqui dentro não tem altura de pai
                // pra resolver, e a gaveta cresceria pra fora da tela.
                maxHeight: height * 0.9,
              },
            ]}
          >
            {/* A alcinha: não faz nada sozinha, mas é o que diz "isso é uma
                gaveta" antes de qualquer texto ser lido. */}
            <View
              style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 14 }}
            />
            {title ? (
              <AppText variant="title" size={15} style={{ marginBottom: 12 }}>
                {title}
              </AppText>
            ) : null}
            {/* Rola quando não cabe — em tela pequena, um teclado numérico e um
                botão já passam da altura da gaveta. */}
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </Rise>
      </View>
    </Modal>
  );
}

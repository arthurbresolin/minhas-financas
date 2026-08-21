import { Pressable, TextInput, View } from 'react-native';
import { useRef } from 'react';

import { AppText } from '@/components/ui/text';
import { centsFromDigits, formatMoney } from '@/lib/format';
import { FONTS } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * O valor em dinheiro, digitado da direita pra esquerda.
 *
 * A pessoa digita só números e os centavos vão preenchendo sozinhos: 5 vira
 * R$ 0,05, 50 vira R$ 0,50, 500 vira R$ 5,00. É o jeito que todo app de banco
 * faz, e é o que evita a briga com a vírgula no meio da digitação.
 *
 * Antes isso era um teclado numérico desenhado à mão, com tecla de apagar e
 * layout próprio. Agora é o teclado do próprio celular — o mesmo que a pessoa
 * já sabe usar, com correção, acessibilidade e haptics de graça.
 *
 * O `TextInput` de verdade fica invisível por cima: o que aparece é o número
 * grande e formatado, mas quem recebe o toque e abre o teclado é o campo.
 */
export function MoneyInput({
  digits,
  onChangeDigits,
  label,
  autoFocus = false,
  color,
}: {
  digits: string;
  onChangeDigits: (digits: string) => void;
  label?: string;
  autoFocus?: boolean;
  /** Sobrescreve a cor do número — a entrada de dinheiro sai em verde. */
  color?: string;
}) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  const cents = centsFromDigits(digits);

  return (
    <Pressable onPress={() => input.current?.focus()} style={{ alignItems: 'center', paddingVertical: 6 }}>
      {label ? (
        <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
          {label}
        </AppText>
      ) : null}

      <AppText variant="numeric" size={40} color={cents ? (color ?? theme.text) : theme.textMuted}>
        {formatMoney(cents)}
      </AppText>

      {/* Sem `opacity: 0`: no Android um campo totalmente transparente às vezes
          não recebe foco. Ele fica com tamanho zero e cor de fundo nenhuma, o
          que dá no mesmo visualmente e continua focável. */}
      <View style={{ height: 0, overflow: 'hidden' }}>
        <TextInput
          ref={input}
          value={digits}
          onChangeText={(texto) => onChangeDigits(texto.replace(/\D/g, '').slice(0, 11))}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          style={{ color: theme.text, fontFamily: FONTS.mono }}
        />
      </View>

      <AppText variant="mono" size={10} muted style={{ marginTop: 4 }}>
        os centavos entram sozinhos
      </AppText>
    </Pressable>
  );
}

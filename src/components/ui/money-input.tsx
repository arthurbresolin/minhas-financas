import { TextInput, View } from 'react-native';
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
 * já sabe usar, com acessibilidade e haptics de graça.
 *
 * O `TextInput` de verdade cobre o bloco inteiro, com texto transparente e sem
 * cursor: quem aparece é o número grande e formatado embaixo. Ele *precisa* ter
 * tamanho de verdade — a primeira versão escondia o campo numa View de altura
 * zero, e um campo sem área não recebe toque com confiança.
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
    <View style={{ alignItems: 'center', paddingVertical: 6 }}>
      {label ? (
        <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
          {label}
        </AppText>
      ) : null}

      <AppText variant="numeric" size={40} color={cents ? (color ?? theme.text) : theme.textMuted}>
        {formatMoney(cents)}
      </AppText>

      <AppText variant="mono" size={10} muted style={{ marginTop: 4 }}>
        os centavos entram sozinhos
      </AppText>

      <TextInput
        ref={input}
        value={digits}
        onChangeText={(texto) => onChangeDigits(texto.replace(/\D/g, '').slice(0, 11))}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        caretHidden
        // O leitor de tela anuncia o valor formatado, não a fila de dígitos.
        accessibilityLabel={label ?? 'valor'}
        accessibilityValue={{ text: formatMoney(cents) }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          color: 'transparent',
          fontFamily: FONTS.mono,
          textAlign: 'center',
        }}
      />
    </View>
  );
}

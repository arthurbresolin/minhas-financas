import { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { contrastRatio, formatRatio, MIN_CONTRAST } from '@/lib/contrast';
import { useTheme } from '@/theme/use-theme';

// Paleta fixa em vez de roda de cores: sem dependência nova, e escolher de uma
// grade curada dá resultado melhor do que arrastar num gradiente com o dedo.
// A primeira linha é a rampa de cinzas, que é o que sustenta fundo e texto.
const PALETA = [
  '#000000', '#0A0A0A', '#141414', '#1F1F1F', '#2A2A2A', '#4A4A4A',
  '#6A6A6A', '#8A8A8A', '#B0B0B0', '#D4D4D4', '#EFEFEF', '#FFFFFF',
  '#FF4D6D', '#FF2E88', '#FFB3D9', '#E0653A', '#F5C542', '#FFE066',
  '#00E676', '#63D6A0', '#B6F5D8', '#22E0FF', '#5B8DEF', '#7C5CFC',
  '#B14BFF', '#C9B8FF', '#C6F24E', '#CDFF46', '#0A0A0F', '#07060D',
];

type Props = {
  visivel: boolean;
  titulo: string;
  valor: string;
  /** Cor contra a qual medir o contraste (normalmente o fundo do tema). */
  contra?: string;
  /** Grade a mostrar. Sem isso, a paleta geral — usada na seção avançada. */
  paleta?: string[];
  /**
   * Mostra o campo de hex.
   *
   * Desligado por padrão: ninguém deveria precisar saber o que é `#FF4D6D` pra
   * deixar o app com a cara que quer. O campo continua existindo pra quem
   * chegou na seção avançada e realmente quer digitar um valor exato.
   */
  mostrarHex?: boolean;
  onFechar: () => void;
  onEscolher: (cor: string) => void;
};

export function SeletorCor({
  visivel,
  titulo,
  valor,
  contra,
  paleta = PALETA,
  mostrarHex = false,
  onFechar,
  onEscolher,
}: Props) {
  const theme = useTheme();
  const [rascunho, setRascunho] = useState(valor);

  const hexValido = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rascunho);
  const razao = contra ? contrastRatio(hexValido ? rascunho : valor, contra) : null;

  function escolher(cor: string) {
    setRascunho(cor);
    onEscolher(cor);
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000099' }} onPress={onFechar} />
      <View
        style={{
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderColor: theme.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          paddingBottom: 34,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="condensed" size={20}>
            {titulo.toUpperCase()}
          </AppText>
          <Pressable onPress={onFechar} hitSlop={12}>
            <AppText size={20} muted>
              ✕
            </AppText>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: hexValido ? rascunho : valor,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />
          {mostrarHex ? (
          <TextInput
            value={rascunho}
            onChangeText={(texto) => {
              const limpo = texto.startsWith('#') ? texto : `#${texto}`;
              setRascunho(limpo.toUpperCase().slice(0, 7));
              if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(limpo)) onEscolher(limpo);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              flex: 1,
              backgroundColor: theme.surfaceAlt,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: hexValido ? theme.border : theme.negative,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: theme.text,
              fontFamily: theme.fontMono,
              fontSize: 15,
            }}
          />
          ) : null}
        </View>

        {razao !== null ? (
          <AppText variant="mono" size={11} color={razao >= MIN_CONTRAST ? theme.positive : theme.negative}>
            contraste {formatRatio(razao)}{' '}
            {razao >= MIN_CONTRAST ? '· dá pra ler' : `· abaixo de ${MIN_CONTRAST}:1, vai cansar a vista`}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {paleta.map((cor) => (
            <Pressable
              key={cor}
              onPress={() => escolher(cor)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: cor,
                borderWidth: cor.toUpperCase() === (hexValido ? rascunho : valor).toUpperCase() ? 2 : 1,
                borderColor:
                  cor.toUpperCase() === (hexValido ? rascunho : valor).toUpperCase()
                    ? theme.accent
                    : theme.border,
              }}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

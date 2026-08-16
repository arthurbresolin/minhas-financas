import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { updateTheme, type ApiThemeTokens } from '@/api';
import { SeletorCor } from '@/components/ng/seletor-cor';
import { Titulo } from '@/components/ng/titulo';
import { ThemePreview } from '@/components/theme/theme-preview';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { contrastRatio, formatRatio, MIN_CONTRAST } from '@/lib/contrast';
import {
  aplicarDetalhe,
  aplicarEstilo,
  aplicarForma,
  aplicarFundo,
  aplicarPrincipal,
  aplicarSecundaria,
  aplicarTipografia,
  tipografiaAtual,
  CORES_DESTAQUE,
  CORES_FUNDO,
  TIPOGRAFIAS,
} from '@/theme/recipes';
import { radiusFor } from '@/theme/style';
import {
  COLOR_TOKENS,
  DECORATION_STYLES,
  FONT_OPTIONS,
  THEME_SHAPES,
  THEME_STYLES,
  type DecorationStyle,
  type Theme,
  type ThemeShape,
  type ThemeStyle,
} from '@/theme/tokens';
import { useThemePicker } from '@/theme/use-theme';

const RAIOS = [0, 8, 14, 20, 26];

const ROTULO_ESTILO: Record<ThemeStyle, string> = {
  clean: 'clean',
  soft: 'soft',
  bold: 'bold',
  playful: 'playful',
  futuristic: 'futuro',
};

const ROTULO_FORMA: Record<ThemeShape, string> = {
  round: 'redondo',
  medium: 'médio',
  sharp: 'reto',
};

const ROTULO_DETALHE: Record<DecorationStyle, string> = {
  none: 'nenhum',
  minimal: 'mínimo',
  doodles: 'rabisco',
  glow: 'brilho',
  outline: 'traço',
};

/** Qual cor está sendo escolhida — cada uma tem sua receita e sua paleta. */
type AlvoCor = 'principal' | 'secundaria' | 'fundo';

/** Só os tokens visuais viram `tokens` no PATCH — id, nome e flag ficam de fora. */
function paraApi(rascunho: Theme): ApiThemeTokens {
  const { id: _id, name: _name, isPreset: _isPreset, ...tokens } = rascunho;
  return tokens;
}

/**
 * A personalização.
 *
 * Cinco decisões, não trinta campos: uma cor, uma vibe, um jeito de escrever,
 * uma forma, um detalhe. Cada uma delas mexe num punhado de tokens de uma vez
 * (as receitas em `theme/recipes`), porque personalidade é combinação — trocar
 * só o raio da borda não muda a cara de nada.
 *
 * Os controles finos não sumiram: estão em "avançado", pra quem realmente quer.
 */
export default function TemaEditorScreen() {
  const router = useRouter();
  const { themes, reload, setTheme } = useThemePicker();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const original = themes.find((item) => String(item.id) === id);
  const [rascunho, setRascunho] = useState<Theme | null>(original ?? null);
  const [alvo, setAlvo] = useState<AlvoCor | null>(null);
  const [tokenAvancado, setTokenAvancado] = useState<keyof Theme | null>(null);
  const [avancado, setAvancado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // A lista de temas chega do servidor depois que a tela monta — e ao abrir o
  // editor por link direto ela nem começou a carregar. Sem semear o rascunho
  // quando o tema aparece, o editor ficaria preso no "não encontrado".
  // A troca só acontece quando muda de tema, pra não apagar edição em curso.
  useEffect(() => {
    if (original && rascunho?.id !== original.id) {
      setRascunho(original);
    }
  }, [original, rascunho?.id]);

  // Todos os pares de cor que precisam ser legíveis. As receitas já evitam a
  // maioria dos casos ruins, mas a seção avançada continua livre — e "editor
  // livre" sem aviso acaba produzindo tela ilegível mais cedo ou mais tarde.
  const avisos = useMemo(() => {
    if (!rascunho) return [];
    const pares: [string, string, string][] = [
      ['Texto no fundo', rascunho.text, rascunho.bg],
      ['Texto apagado no fundo', rascunho.textMuted, rascunho.bg],
      ['Texto no cartão', rascunho.text, rascunho.surface],
      ['Texto sobre o destaque', rascunho.onAccent, rascunho.accent],
    ];
    return pares
      .map(([label, frente, fundo]) => ({ label, razao: contrastRatio(frente, fundo) }))
      .filter((item) => item.razao < MIN_CONTRAST);
  }, [rascunho]);

  if (!rascunho) {
    return (
      <Screen>
        <Titulo titulo="tema" voltar />
        {/* Sem a lista ainda não dá pra dizer que o tema não existe — só que
            ele não chegou. Confundir os dois faz a tela mentir. */}
        <AppText muted>{themes.length ? 'Tema não encontrado.' : 'Carregando…'}</AppText>
      </Screen>
    );
  }

  if (rascunho.isPreset) {
    return (
      <Screen>
        <Titulo titulo={rascunho.name} voltar />
        <AppText muted>
          Este é um pack de fábrica, só leitura. Toque em "personalizar" na tela de aparência: ele
          vira uma cópia sua, e aí dá pra mexer à vontade.
        </AppText>
      </Screen>
    );
  }

  const tema = rascunho;

  function mudar<K extends keyof Theme>(chave: K, valor: Theme[K]) {
    setRascunho((atual) => (atual ? { ...atual, [chave]: valor } : atual));
  }

  function escolherCor(cor: string) {
    setRascunho((atual) => {
      if (!atual) return atual;
      if (alvo === 'fundo') return aplicarFundo(atual, cor);
      if (alvo === 'secundaria') return aplicarSecundaria(atual, cor);
      return aplicarPrincipal(atual, cor);
    });
  }

  async function salvar() {
    if (typeof tema.id !== 'number') return;
    setSalvando(true);
    try {
      await updateTheme(tema.id, { name: tema.name, tokens: paraApi(tema) });
      await reload();
      setTheme(tema.id);
      router.back();
    } catch {
      Alert.alert('Não deu pra salvar', 'Verifique a conexão e tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  const corAtual =
    alvo === 'fundo' ? tema.bg : alvo === 'secundaria' ? tema.accentAlt : tema.accent;

  return (
    <Screen>
      <Titulo chapeu="personalizando" titulo={tema.name} voltar />

      {/* A prévia é o assunto da tela: ela ocupa o topo inteiro e reage a cada
          toque. É o mesmo componente da loja — se ela mentisse aqui, a pessoa
          salvaria um tema que não é o que viu. */}
      <View style={{ alignItems: 'center' }}>
        <ThemePreview theme={tema} width={Math.min(width - 36, 260)} detailed />
      </View>

      <Grupo titulo="cor">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BotaoCor tema={tema} cor={tema.accent} label="principal" onPress={() => setAlvo('principal')} />
          <BotaoCor tema={tema} cor={tema.accentAlt} label="apoio" onPress={() => setAlvo('secundaria')} />
          <BotaoCor tema={tema} cor={tema.bg} label="fundo" onPress={() => setAlvo('fundo')} />
        </View>
      </Grupo>

      <Grupo titulo="estilo">
        <Linha>
          {THEME_STYLES.map((estilo) => (
            <Opcao
              key={estilo}
              tema={tema}
              ativo={tema.style === estilo}
              label={ROTULO_ESTILO[estilo]}
              onPress={() => setRascunho(aplicarEstilo(tema, estilo))}
            />
          ))}
        </Linha>
      </Grupo>

      <Grupo titulo="tipografia">
        <Linha>
          {TIPOGRAFIAS.map((opcao) => {
            const ativa = tipografiaAtual(tema) === opcao.id;
            return (
              <Pressable
                key={opcao.id}
                onPress={() => setRascunho(aplicarTipografia(tema, opcao.id))}
                style={{
                  width: 56,
                  height: 48,
                  borderRadius: radiusFor(tema, 14),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: ativa ? tema.accent : tema.surface,
                  borderWidth: 1,
                  borderColor: ativa ? tema.accent : tema.border,
                }}
              >
                {/* A amostra é escrita na própria fonte — o nome dela sozinho
                    não diz nada pra quem não conhece tipografia. */}
                <Text
                  style={{
                    fontFamily: opcao.fontDisplay,
                    fontSize: 20,
                    color: ativa ? tema.onAccent : tema.text,
                  }}
                >
                  {opcao.label}
                </Text>
              </Pressable>
            );
          })}
        </Linha>
      </Grupo>

      <Grupo titulo="formas">
        <Linha>
          {THEME_SHAPES.map((forma) => {
            const ativa = tema.shape === forma;
            return (
              <Pressable
                key={forma}
                onPress={() => setRascunho(aplicarForma(tema, forma))}
                style={{ alignItems: 'center', gap: 6 }}
              >
                {/* O quadradinho já tem o raio da opção: a forma se mostra
                    sozinha, sem precisar de rótulo explicando. */}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: forma === 'sharp' ? 2 : forma === 'medium' ? 12 : 22,
                    // `surfaceAlt` e não `surface`: num tema claro o cartão é
                    // quase o fundo, e o quadradinho da forma sumiria.
                    backgroundColor: ativa ? tema.accent : tema.surfaceAlt,
                    borderWidth: ativa ? 0 : 1,
                    borderColor: tema.border,
                  }}
                />
                <AppText variant="label" size={10} muted={!ativa}>
                  {ROTULO_FORMA[forma]}
                </AppText>
              </Pressable>
            );
          })}
        </Linha>
      </Grupo>

      <Grupo titulo="detalhes">
        <Linha>
          {DECORATION_STYLES.map((detalhe) => (
            <Opcao
              key={detalhe}
              tema={tema}
              ativo={tema.decorationStyle === detalhe}
              label={ROTULO_DETALHE[detalhe]}
              onPress={() => setRascunho(aplicarDetalhe(tema, detalhe))}
            />
          ))}
        </Linha>
      </Grupo>

      <Field
        label="Nome do tema"
        value={tema.name}
        onChangeText={(texto) => mudar('name', texto.slice(0, 60))}
        placeholder="Meu tema"
      />

      {avisos.length ? (
        <View
          style={{
            borderRadius: radiusFor(tema, 14),
            borderWidth: 1,
            borderColor: tema.negative,
            padding: 14,
            gap: 6,
          }}
        >
          <AppText variant="label" size={11} color={tema.negative}>
            DIFÍCIL DE LER
          </AppText>
          {avisos.map((aviso) => (
            <AppText key={aviso.label} variant="mono" size={11} muted>
              {aviso.label}: {formatRatio(aviso.razao)}
            </AppText>
          ))}
          <AppText muted size={12}>
            O mínimo confortável é {MIN_CONTRAST}:1. Dá pra salvar assim, mas o app vai cansar a
            vista.
          </AppText>
        </View>
      ) : null}

      <Button title="Salvar tema" onPress={salvar} loading={salvando} />

      {/* Tudo que é ajuste fino mora aqui embaixo, fechado. Quem chegou pra
          trocar a cara do app não precisa ver onze tokens de cor; quem quer
          mexer em cada um continua podendo. */}
      <Pressable
        onPress={() => setAvancado((atual) => !atual)}
        style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
      >
        <AppText variant="label" size={11} muted style={{ textTransform: 'uppercase' }}>
          {avancado ? '▲ esconder avançado' : '▼ avançado'}
        </AppText>
      </Pressable>

      {avancado ? (
        <View style={{ gap: 16 }}>
          <AppText variant="condensed" size={17}>
            CORES, UMA A UMA
          </AppText>
          <View style={{ gap: 4 }}>
            {COLOR_TOKENS.map(({ key, label, hint }) => (
              <Pressable
                key={key}
                onPress={() => setTokenAvancado(key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radiusFor(tema, 10),
                    backgroundColor: tema[key] as string,
                    borderWidth: 1,
                    borderColor: tema.border,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <AppText size={14}>{label}</AppText>
                  <AppText muted size={11}>
                    {hint}
                  </AppText>
                </View>
                <AppText variant="mono" size={12} muted>
                  {String(tema[key]).toUpperCase()}
                </AppText>
              </Pressable>
            ))}
          </View>

          <AppText variant="condensed" size={17}>
            FONTES SEPARADAS
          </AppText>
          {(
            [
              ['fontDisplay', 'Títulos'],
              ['fontMono', 'Números'],
              ['fontSans', 'Texto corrido'],
            ] as const
          ).map(([chave, label]) => (
            <View key={chave} style={{ gap: 8 }}>
              <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
                {label}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FONT_OPTIONS.map((opcao) => {
                  const ativa = tema[chave] === opcao.value;
                  return (
                    <Pressable
                      key={opcao.value}
                      onPress={() => mudar(chave, opcao.value)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: radiusFor(tema, 12),
                        backgroundColor: ativa ? tema.accent : tema.surface,
                        borderWidth: 1,
                        borderColor: ativa ? tema.accent : tema.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: opcao.value,
                          fontSize: 14,
                          color: ativa ? tema.onAccent : tema.text,
                        }}
                      >
                        {opcao.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          <AppText variant="condensed" size={17}>
            RAIO EXATO
          </AppText>
          <Linha>
            {RAIOS.map((raio) => {
              const ativo = tema.radius === raio;
              return (
                <Pressable
                  key={raio}
                  onPress={() => mudar('radius', raio)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: raio,
                    alignItems: 'center',
                    backgroundColor: ativo ? tema.accent : tema.surface,
                    borderWidth: 1,
                    borderColor: ativo ? tema.accent : tema.border,
                  }}
                >
                  <AppText variant="mono" size={11} color={ativo ? tema.onAccent : tema.textMuted}>
                    {raio}
                  </AppText>
                </Pressable>
              );
            })}
          </Linha>
        </View>
      ) : null}

      {/* Montados só quando abrem, e com `key` no alvo: o seletor guarda um
          rascunho próprio da cor, que sem remontar ficaria preso no valor do
          primeiro que foi aberto. */}
      {alvo ? (
        <SeletorCor
          key={alvo}
          visivel
          titulo={alvo === 'fundo' ? 'fundo' : alvo === 'secundaria' ? 'cor de apoio' : 'cor principal'}
          valor={corAtual}
          paleta={alvo === 'fundo' ? CORES_FUNDO : CORES_DESTAQUE}
          // O fundo se mede contra o texto que vai por cima dele; as cores de
          // destaque, contra o fundo da tela.
          contra={alvo === 'fundo' ? tema.text : tema.bg}
          onFechar={() => setAlvo(null)}
          onEscolher={escolherCor}
        />
      ) : null}

      {tokenAvancado ? (
        <SeletorCor
          key={tokenAvancado}
          visivel
          mostrarHex
          titulo={COLOR_TOKENS.find((item) => item.key === tokenAvancado)?.label ?? ''}
          valor={String(tema[tokenAvancado])}
          // O "sobre o destaque" se mede contra o próprio destaque; o resto,
          // contra o fundo da tela.
          contra={tokenAvancado === 'onAccent' ? tema.accent : tema.bg}
          onFechar={() => setTokenAvancado(null)}
          onEscolher={(cor) => mudar(tokenAvancado, cor as never)}
        />
      ) : null}
    </Screen>
  );
}

/** Um bloco da personalização: título miúdo e o controle embaixo. */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="label" muted size={10} style={{ textTransform: 'uppercase' }}>
        {titulo}
      </AppText>
      {children}
    </View>
  );
}

function Linha({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/** Uma escolha simples de texto. */
function Opcao({
  tema,
  ativo,
  label,
  onPress,
}: {
  tema: Theme;
  ativo: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: radiusFor(tema, 14),
        backgroundColor: ativo ? tema.accent : tema.surface,
        borderWidth: 1,
        borderColor: ativo ? tema.accent : tema.border,
      }}
    >
      <AppText size={13} color={ativo ? tema.onAccent : tema.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** O botão redondo de cor: a cor é o próprio controle, sem hex à vista. */
function BotaoCor({
  tema,
  cor,
  label,
  onPress,
}: {
  tema: Theme;
  cor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: '100%',
          height: 52,
          borderRadius: radiusFor(tema, 16),
          backgroundColor: cor,
          borderWidth: 1,
          borderColor: tema.border,
        }}
      />
      <AppText variant="label" size={10} muted>
        {label}
      </AppText>
    </Pressable>
  );
}

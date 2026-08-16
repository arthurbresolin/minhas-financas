import { LinearGradient } from 'expo-linear-gradient';
import { Text, View, type DimensionValue } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Doodle } from '@/components/ng/doodle';
import { FONTS, type Theme } from '@/theme/tokens';
import { alpha, buttonSkin, cardSkin, radiusFor, readableOn } from '@/theme/style';

/**
 * O app inteiro, em miniatura, pintado com um tema qualquer.
 *
 * Este é o componente que vende o tema: duas cores lado a lado não dizem nada,
 * mas um recorte da tela de verdade — com a tipografia, o formato do cartão, o
 * botão, a barra e o fundo daquele pack — deixa a personalidade óbvia antes de
 * qualquer texto explicar.
 *
 * Recebe o tema por parâmetro em vez de usar `useTheme()`: a loja precisa
 * desenhar seis temas ao mesmo tempo, e só um deles é o ativo. É por isso que
 * aqui se usa `Text` cru — `AppText` leria sempre o tema ativo.
 *
 * As peles vêm do mesmo `cardSkin`/`buttonSkin` que as telas de verdade usam.
 * Se a miniatura mentisse, a loja venderia um app que não existe.
 */
type Props = {
  theme: Theme;
  /** Largura total; a altura sai daí. Tudo dentro escala junto. */
  width: number;
  /** Versão grande da personalização: mostra uma linha a mais de conteúdo. */
  detailed?: boolean;
};

export function ThemePreview({ theme, width, detailed = false }: Props) {
  // Todas as medidas são calibradas para 156 de largura e escalam a partir daí,
  // pra mesma miniatura servir na grade e na preview da personalização.
  const s = width / 156;
  const u = (n: number) => Math.round(n * s);
  const height = detailed ? u(228) : u(190);
  const pad = u(theme.density === 'compact' ? 9 : theme.density === 'roomy' ? 13 : 11);

  const card = cardSkin(theme, {});
  const cardDestaque = cardSkin(theme, { destaque: true });
  const botao = buttonSkin(theme, 'primary', u(20));

  return (
    <View
      style={{
        width,
        height,
        borderRadius: Math.max(radiusFor(theme, 20), u(6)),
        backgroundColor: theme.bg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <MiniFundo theme={theme} width={width} height={height} />

      <View style={{ flex: 1, padding: pad, gap: u(theme.density === 'roomy' ? 8 : 6) }}>
        {/* Cabeçalho: o chapéu miúdo e o título na fonte de display do tema. */}
        <Text
          style={{
            fontFamily: theme.fontSans,
            fontSize: u(5.5),
            letterSpacing: u(0.5),
            color: theme.textMuted,
            textTransform: 'uppercase',
          }}
        >
          minha grana
        </Text>
        <Text style={{ fontFamily: theme.fontDisplay, fontSize: u(11), color: theme.text }}>
          carteira
        </Text>

        {/* O saldo. Sempre o maior elemento — é o que a pessoa abre o app pra ver. */}
        <Text
          style={{
            fontFamily: FONTS.numeric,
            fontSize: u(detailed ? 30 : 25),
            lineHeight: u(detailed ? 32 : 27),
            color: theme.text,
          }}
        >
          R$ 4.820
        </Text>

        <View style={{ flexDirection: 'row', gap: u(5), alignItems: 'center' }}>
          <MiniValor theme={theme} cor={theme.positive} label="entrou" u={u} />
          <MiniValor theme={theme} cor={theme.negative} label="saiu" u={u} />
        </View>

        {/* Uma linha de extrato, com a pele de verdade do cartão do tema: é o
            elemento que a pessoa mais vê no app, então é o que a miniatura
            mostra. */}
        <View style={[card, { padding: u(7), flexDirection: 'row', alignItems: 'center', gap: u(6) }]}>
          <View
            style={{
              width: u(14),
              height: u(14),
              borderRadius: theme.shape === 'sharp' ? u(3) : u(7),
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.cardStyle === 'filled' ? theme.surfaceAlt : 'transparent',
            }}
          />
          <View style={{ flex: 1, gap: u(3) }}>
            <MiniLinha theme={theme} u={u} largura="80%" />
            <MiniLinha theme={theme} u={u} largura="50%" fraca />
          </View>
          <Text style={{ fontFamily: theme.fontMono, fontSize: u(6), color: theme.negative }}>
            −38
          </Text>
        </View>

        {detailed ? (
          <View style={[cardDestaque, { padding: u(7), gap: u(4) }]}>
            <MiniLinha theme={theme} u={u} largura="55%" />
            <MiniBarra theme={theme} u={u} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: u(5), alignItems: 'center' }}>
          <View
            style={[
              botao.container,
              { paddingHorizontal: u(9), paddingVertical: u(4), alignItems: 'center' },
            ]}
          >
            <Text style={{ fontFamily: theme.fontDisplay, fontSize: u(6), color: botao.foreground }}>
              lançar
            </Text>
          </View>
          <MiniDecoracao theme={theme} u={u} />
        </View>

        <View style={{ flex: 1 }} />

        <MiniNav theme={theme} u={u} pad={pad} />
      </View>
    </View>
  );
}

/** O tratamento de fundo do tema, reduzido — o mesmo vocabulário do `Backdrop`. */
function MiniFundo({ theme, width, height }: { theme: Theme; width: number; height: number }) {
  if (theme.backgroundStyle === 'grid') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.5 }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({ length: 9 }, (_, i) => {
            const y = 100 / (1 + i * 0.5);
            return (
              <Line key={`h${i}`} x1={0} y1={y} x2={100} y2={y} stroke={theme.text} strokeWidth={0.7} opacity={0.3 * (y / 100)} />
            );
          })}
          {Array.from({ length: 8 }, (_, i) => (
            <Line key={`v${i}`} x1={(i - 3.5) * 40 + 50} y1={100} x2={50} y2={0} stroke={theme.text} strokeWidth={0.7} opacity={0.14} />
          ))}
        </Svg>
      </View>
    );
  }
  if (theme.backgroundStyle === 'glow') {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(theme.accent, 0.3), alpha(theme.accent, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: -height * 0.2, left: -width * 0.2, width: width * 0.9, height: width * 0.9, borderRadius: width }}
      />
    );
  }
  if (theme.backgroundStyle === 'gradient') {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(theme.surfaceAlt, 0.9), theme.bg, alpha(theme.surface, 0.85), theme.bg]}
        locations={[0, 0.35, 0.62, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    );
  }
  return null;
}

function MiniValor({
  theme,
  cor,
  label,
  u,
}: {
  theme: Theme;
  cor: string;
  label: string;
  u: (n: number) => number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(3) }}>
      <View style={{ width: u(4), height: u(4), borderRadius: u(2), backgroundColor: cor }} />
      <Text style={{ fontFamily: theme.fontMono, fontSize: u(6), color: theme.textMuted }}>{label}</Text>
    </View>
  );
}

function MiniLinha({
  theme,
  u,
  largura,
  fraca,
}: {
  theme: Theme;
  u: (n: number) => number;
  largura: DimensionValue;
  fraca?: boolean;
}) {
  return (
    <View
      style={{
        width: largura,
        height: u(3.5),
        borderRadius: u(2),
        backgroundColor: fraca ? alpha(theme.textMuted, 0.45) : alpha(theme.text, 0.7),
      }}
    />
  );
}

/** A barra de um pote de meta — o gráfico do app em versão de bolso. */
function MiniBarra({ theme, u }: { theme: Theme; u: (n: number) => number }) {
  return (
    <View style={{ height: u(5), borderRadius: u(3), backgroundColor: alpha(theme.textMuted, 0.25), overflow: 'hidden' }}>
      <View style={{ width: '62%', height: '100%', borderRadius: u(3), backgroundColor: theme.accent }} />
    </View>
  );
}

/** O detalhe decorativo do tema: rabisco, brilho, contorno ou nada. */
function MiniDecoracao({ theme, u }: { theme: Theme; u: (n: number) => number }) {
  switch (theme.decorationStyle) {
    case 'doodles':
      return <Doodle name="brilho" color={theme.accentAlt} size={u(16)} strokeWidth={1.6} />;
    case 'glow':
      return (
        <View
          style={{
            width: u(10),
            height: u(10),
            borderRadius: u(5),
            backgroundColor: theme.accentAlt,
            shadowColor: theme.accentAlt,
            shadowOpacity: 0.9,
            shadowRadius: u(6),
            shadowOffset: { width: 0, height: 0 },
            elevation: 5,
          }}
        />
      );
    case 'outline':
      return (
        <View
          style={{
            width: u(11),
            height: u(11),
            borderWidth: u(1.4),
            borderColor: theme.accentAlt,
            transform: [{ rotate: '12deg' }],
          }}
        />
      );
    case 'minimal':
      return <View style={{ width: u(14), height: u(1.6), backgroundColor: theme.textMuted }} />;
    case 'none':
    default:
      return null;
  }
}

/** A barra de abas, na forma que o tema pede. */
function MiniNav({ theme, u, pad }: { theme: Theme; u: (n: number) => number; pad: number }) {
  const dock = theme.navStyle === 'dock';
  const minimal = theme.navStyle === 'minimal';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: u(4),
        paddingHorizontal: minimal ? 0 : u(7),
        // O dock encosta nas bordas da tela: some com o respiro lateral do pai.
        marginHorizontal: dock ? -pad : 0,
        marginBottom: dock ? -pad : 0,
        backgroundColor: minimal ? 'transparent' : theme.surface,
        borderTopWidth: dock ? 1 : 0,
        borderWidth: dock || minimal ? 0 : 1,
        borderColor: theme.border,
        borderRadius: dock || minimal ? 0 : Math.max(radiusFor(theme, 14), u(4)),
      }}
    >
      <MiniIcone theme={theme} u={u} ativo />
      <View
        style={{
          width: u(15),
          height: u(15),
          borderRadius: theme.shape === 'sharp' ? u(3) : u(8),
          backgroundColor: theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: theme.fontSans,
            fontSize: u(9),
            lineHeight: u(11),
            color: readableOn(theme.accent, theme.onAccent),
          }}
        >
          +
        </Text>
      </View>
      <MiniIcone theme={theme} u={u} />
    </View>
  );
}

function MiniIcone({ theme, u, ativo }: { theme: Theme; u: (n: number) => number; ativo?: boolean }) {
  const cor = ativo ? theme.text : theme.textMuted;
  const tamanho = u(6);

  if (theme.iconStyle === 'doodle') {
    return <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, borderWidth: u(1.2), borderColor: cor }} />;
  }
  if (theme.iconStyle === 'pixel') {
    return <View style={{ width: tamanho, height: tamanho, backgroundColor: cor }} />;
  }
  if (theme.iconStyle === 'geometric') {
    return <View style={{ width: tamanho, height: tamanho, backgroundColor: cor, transform: [{ rotate: '45deg' }] }} />;
  }
  return <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor }} />;
}

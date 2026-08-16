import { luminance, mix, readableOn } from '@/theme/style';
import type { DecorationStyle, ThemeShape, ThemeStyle, ThemeTokens } from '@/theme/tokens';

/**
 * As receitas da personalização.
 *
 * A pessoa não escolhe onze cores nem doze eixos: ela escolhe uma cor, uma
 * vibe, uma forma. Cada escolha dessas aqui vira um punhado de tokens
 * coerentes entre si.
 *
 * É o que separa "personalizar o app" de "editar um arquivo de configuração" —
 * e é também a rede de proteção: nenhuma combinação escolhida por aqui produz
 * texto ilegível, porque as cores de apoio são *derivadas* da escolha, não
 * deixadas como estavam.
 */

/**
 * Aplica um remendo mantendo o tipo de quem chamou.
 *
 * As receitas recebem tanto `ThemeTokens` cru quanto um `Theme` inteiro (com
 * id e nome). Genérico aqui evita que a tela tenha que remontar o objeto a cada
 * toque só pra não perder a identidade do tema.
 */
function com<T extends ThemeTokens>(tokens: T, patch: Partial<ThemeTokens>): T {
  return { ...tokens, ...patch } as T;
}

// ---------------------------------------------------------------------------
// Cor
// ---------------------------------------------------------------------------

/**
 * Troca o fundo e recalcula tudo que precisa se ler em cima dele.
 *
 * Sem isso, escolher um fundo claro num tema escuro deixaria o texto branco no
 * branco — o jeito clássico de um editor de temas produzir um app quebrado. As
 * superfícies e o texto passam a ser sempre um afastamento do próprio fundo.
 */
export function aplicarFundo<T extends ThemeTokens>(tokens: T, bg: string): T {
  const claro = luminance(bg) > 0.45;
  const oposto = claro ? '#000000' : '#FFFFFF';
  return com(tokens, {
    bg,
    surface: mix(bg, oposto, claro ? 0.04 : 0.05),
    surfaceAlt: mix(bg, oposto, claro ? 0.09 : 0.1),
    border: mix(bg, oposto, claro ? 0.16 : 0.18),
    text: mix(bg, oposto, claro ? 0.88 : 0.93),
    textMuted: mix(bg, oposto, 0.55),
    swatch: [tokens.swatch[0], bg],
  });
}

/** Troca a cor principal e o texto que vai por cima dela. */
export function aplicarPrincipal<T extends ThemeTokens>(tokens: T, accent: string): T {
  return com(tokens, {
    accent,
    // Quem decide o texto do botão é o contraste, não a preferência: um accent
    // amarelo com `onAccent` branco é ilegível por construção.
    onAccent: readableOn(accent, tokens.onAccent),
    swatch: [accent, tokens.swatch[1]],
  });
}

/** Troca a cor secundária — o segundo acento, usado em barras e detalhes. */
export function aplicarSecundaria<T extends ThemeTokens>(tokens: T, accentAlt: string): T {
  return com(tokens, { accentAlt });
}

// ---------------------------------------------------------------------------
// Estilo
// ---------------------------------------------------------------------------

/** O que cada vibe faz com o desenho do app. Um toque, o app inteiro muda. */
const ESTILOS: Record<ThemeStyle, Partial<ThemeTokens>> = {
  clean: {
    cardStyle: 'filled',
    buttonStyle: 'solid',
    decorationStyle: 'none',
    navStyle: 'floating',
    iconStyle: 'glyph',
    backgroundStyle: 'plain',
    density: 'roomy',
    shape: 'medium',
    outlined: false,
  },
  soft: {
    cardStyle: 'filled',
    buttonStyle: 'solid',
    decorationStyle: 'minimal',
    navStyle: 'floating',
    iconStyle: 'doodle',
    backgroundStyle: 'plain',
    density: 'roomy',
    shape: 'round',
    outlined: false,
  },
  bold: {
    cardStyle: 'outline',
    buttonStyle: 'sticker',
    decorationStyle: 'outline',
    navStyle: 'dock',
    iconStyle: 'geometric',
    backgroundStyle: 'plain',
    density: 'compact',
    shape: 'sharp',
    outlined: true,
  },
  playful: {
    cardStyle: 'filled',
    buttonStyle: 'solid',
    decorationStyle: 'doodles',
    navStyle: 'floating',
    iconStyle: 'doodle',
    backgroundStyle: 'plain',
    density: 'regular',
    shape: 'round',
    outlined: false,
  },
  futuristic: {
    cardStyle: 'line',
    buttonStyle: 'glow',
    decorationStyle: 'glow',
    navStyle: 'floating',
    iconStyle: 'geometric',
    backgroundStyle: 'grid',
    density: 'compact',
    shape: 'medium',
    outlined: false,
  },
};

export function aplicarEstilo<T extends ThemeTokens>(tokens: T, style: ThemeStyle): T {
  return com(tokens, { ...ESTILOS[style], style });
}

// ---------------------------------------------------------------------------
// Forma
// ---------------------------------------------------------------------------

/**
 * `shape` é o multiplicador e `radius` é a base. Mexer nos dois junto é o que
 * faz a forma mudar de verdade na tela em vez de só um pouquinho.
 */
const RAIOS: Record<ThemeShape, number> = { sharp: 4, medium: 16, round: 26 };

export function aplicarForma<T extends ThemeTokens>(tokens: T, shape: ThemeShape): T {
  return com(tokens, { shape, radius: RAIOS[shape] });
}

export function aplicarDetalhe<T extends ThemeTokens>(tokens: T, decorationStyle: DecorationStyle): T {
  return com(tokens, { decorationStyle });
}

// ---------------------------------------------------------------------------
// Tipografia
// ---------------------------------------------------------------------------

/**
 * Combinações prontas, não três listas de fontes.
 *
 * Escolher display, mono e sans separado é trabalho de designer; aqui a pessoa
 * escolhe um jeito de escrever. As três famílias vão juntas porque é a
 * combinação que tem personalidade, não a fonte isolada.
 */
export const TIPOGRAFIAS: {
  id: string;
  label: string;
  fontDisplay: string;
  fontMono: string;
  fontSans: string;
}[] = [
  {
    id: 'grotesk',
    label: 'Aa',
    fontDisplay: 'SpaceGrotesk_700Bold',
    fontMono: 'IBMPlexMono_600SemiBold',
    fontSans: 'Inter_400Regular',
  },
  {
    id: 'editorial',
    label: 'Aa',
    fontDisplay: 'Archivo_900Black_Italic',
    fontMono: 'IBMPlexMono_600SemiBold',
    fontSans: 'Inter_500Medium',
  },
  {
    id: 'bloco',
    label: 'Aa',
    fontDisplay: 'Anton_400Regular',
    fontMono: 'IBMPlexMono_600SemiBold',
    fontSans: 'Inter_500Medium',
  },
  {
    id: 'suave',
    label: 'Aa',
    fontDisplay: 'SpaceGrotesk_500Medium',
    fontMono: 'IBMPlexMono_600SemiBold',
    fontSans: 'Inter_400Regular',
  },
];

export function aplicarTipografia<T extends ThemeTokens>(tokens: T, id: string): T {
  const escolha = TIPOGRAFIAS.find((item) => item.id === id);
  if (!escolha) return tokens;
  const { fontDisplay, fontMono, fontSans } = escolha;
  return com(tokens, { fontDisplay, fontMono, fontSans });
}

/** Qual combinação está ativa — pela fonte de título, que é a que dá o tom. */
export function tipografiaAtual(tokens: ThemeTokens): string | null {
  return TIPOGRAFIAS.find((item) => item.fontDisplay === tokens.fontDisplay)?.id ?? null;
}

/**
 * Uma paleta enxuta pros seletores de cor.
 *
 * Vinte e quatro cores escolhidas, não um disco de matiz: o objetivo é que
 * toda escolha possível dê num tema bonito. Cor de fundo tem lista própria
 * porque fundo é a decisão que mais estraga um tema.
 */
export const CORES_DESTAQUE = [
  '#FFFFFF', '#0A0A0A', '#FF2D2D', '#D81E45', '#FF6FB3', '#FF8FA8',
  '#F5C542', '#E0653A', '#C6F24E', '#4F8F5F', '#1B8055', '#22E0FF',
  '#1E7FC4', '#1B36D8', '#5B8DEF', '#7C5CFC', '#B14BFF', '#FF2E88',
  '#67D4FF', '#BCD6A4', '#8FCDEE', '#FFB3D9', '#C9B8FF', '#8A8A8A',
];

export const CORES_FUNDO = [
  '#000000', '#050505', '#0A0A0F', '#05060E', '#07060D', '#0E0E0C',
  '#141414', '#1A1622', '#060A14', '#12100E', '#0B0D1A', '#101418',
  '#FFFFFF', '#FBFDFF', '#FFF7F2', '#F6F4EA', '#F4F1FF', '#EFF4F8',
  '#D5DBE4', '#E8E4DA', '#FFF3E0', '#EAF5EE', '#F7E9EC', '#E6EAF2',
];

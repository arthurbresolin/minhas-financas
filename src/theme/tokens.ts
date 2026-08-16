/**
 * Um tema não é uma paleta — é uma personalidade visual.
 *
 * Além das cores, um tema carrega *como* o app é desenhado: cartão de contorno
 * ou chapado, botão adesivo ou luminoso, fundo liso ou com grid, ícone de
 * traço ou geométrico. Cada um desses eixos é um token, então trocar de tema
 * troca o desenho inteiro sem nenhuma tela saber qual tema está ativo.
 *
 * Os temas de verdade vivem no banco, por usuário (`/themes`). O que está aqui
 * embaixo é só a cópia local dos presets de fábrica: é com ela que o app pinta
 * a primeira tela, antes de qualquer resposta do servidor e mesmo sem rede.
 * Precisa ser igual ao `FACTORY_THEMES` do backend.
 */

/** A "vibe" do tema. É o eixo que a personalização usa como atalho. */
export type ThemeStyle = 'clean' | 'soft' | 'bold' | 'playful' | 'futuristic';
export type ThemeShape = 'sharp' | 'medium' | 'round';
/** `line` = fundo transparente com fio de 1px; `outline` = traço grosso. */
export type CardStyle = 'filled' | 'outline' | 'glass' | 'line';
export type ButtonStyle = 'solid' | 'sticker' | 'outline' | 'glow';
export type IconStyle = 'glyph' | 'doodle' | 'geometric' | 'pixel';
export type NavStyle = 'floating' | 'dock' | 'minimal';
export type BackgroundStyle = 'plain' | 'grid' | 'glow' | 'gradient';
export type DecorationStyle = 'none' | 'minimal' | 'doodles' | 'glow' | 'outline';
export type Density = 'compact' | 'regular' | 'roomy';

export const THEME_STYLES: ThemeStyle[] = ['clean', 'soft', 'bold', 'playful', 'futuristic'];
export const THEME_SHAPES: ThemeShape[] = ['sharp', 'medium', 'round'];
export const CARD_STYLES: CardStyle[] = ['filled', 'outline', 'glass', 'line'];
export const BUTTON_STYLES: ButtonStyle[] = ['solid', 'sticker', 'outline', 'glow'];
export const ICON_STYLES: IconStyle[] = ['glyph', 'doodle', 'geometric', 'pixel'];
export const NAV_STYLES: NavStyle[] = ['floating', 'dock', 'minimal'];
export const BACKGROUND_STYLES: BackgroundStyle[] = ['plain', 'grid', 'glow', 'gradient'];
export const DECORATION_STYLES: DecorationStyle[] = ['none', 'minimal', 'doodles', 'glow', 'outline'];
export const DENSITIES: Density[] = ['compact', 'regular', 'roomy'];

/**
 * Os tokens como chegam da API.
 *
 * Tudo que foi acrescentado depois do primeiro desenho é opcional: existe tema
 * salvo no banco desde antes desses campos, e um tema antigo tem que continuar
 * carregando. Quem preenche os buracos é o `resolveTheme`, num lugar só.
 */
export type ThemeTokens = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  /** Segundo acento: barra do segundo pote, brilho do cofrinho, gradientes. */
  accentAlt: string;
  positive: string;
  negative: string;
  radius: number;
  /**
   * Herança do primeiro desenho, quando só existia "traço ou chapado". Continua
   * aqui porque é o que permite adivinhar `cardStyle` e `buttonStyle` de um
   * tema salvo antes deles existirem.
   */
  outlined: boolean;
  /** Amostra da loja de temas. */
  swatch: [string, string];
  fontDisplay: string;
  fontMono: string;
  fontSans: string;

  // --- Personalidade. Opcionais: tema antigo não tem nenhum deles. ---
  style?: ThemeStyle;
  shape?: ThemeShape;
  cardStyle?: CardStyle;
  buttonStyle?: ButtonStyle;
  iconStyle?: IconStyle;
  navStyle?: NavStyle;
  backgroundStyle?: BackgroundStyle;
  decorationStyle?: DecorationStyle;
  density?: Density;
  /** Uma palavra na miniatura: "seco", "doce". Vende a sensação, não a config. */
  vibe?: string;
};

/** Os mesmos tokens depois do `resolveTheme`: sem buraco, ninguém checa `undefined`. */
export type ResolvedTokens = Required<ThemeTokens>;

/** Um tema como o app usa: os tokens resolvidos junto da identidade da linha. */
export type Theme = ResolvedTokens & {
  id: number | string;
  name: string;
  isPreset: boolean;
};

/**
 * Fontes fixas, fora do tema.
 *
 * `condensed`, `numeric` e `hand` são a assinatura do desenho e ficam de fora
 * do editor — trocar elas não muda a cor do app, muda o app. As três
 * escolhíveis (display, mono, sans) vêm do tema.
 */
export const FONTS = {
  condensed: 'Archivo_900Black_Italic',
  numeric: 'Anton_400Regular',
  hand: 'Caveat_700Bold',
} as const;

/** As famílias que o editor oferece. Espelha `ALLOWED_FONTS` do backend. */
export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'SpaceGrotesk_700Bold', label: 'Space Grotesk' },
  { value: 'SpaceGrotesk_500Medium', label: 'Space Grotesk médio' },
  { value: 'IBMPlexMono_600SemiBold', label: 'IBM Plex Mono' },
  { value: 'Inter_400Regular', label: 'Inter' },
  { value: 'Inter_500Medium', label: 'Inter médio' },
  { value: 'Archivo_900Black_Italic', label: 'Archivo condensada' },
  { value: 'Anton_400Regular', label: 'Anton' },
  { value: 'Caveat_700Bold', label: 'Caveat manuscrita' },
];

/** Os tokens de cor que a seção avançada deixa mexer, na ordem em que aparecem. */
export const COLOR_TOKENS: { key: keyof ThemeTokens; label: string; hint: string }[] = [
  { key: 'bg', label: 'Fundo', hint: 'O fundo de todas as telas' },
  { key: 'text', label: 'Texto', hint: 'A cor da maior parte do texto' },
  { key: 'textMuted', label: 'Texto apagado', hint: 'Legendas e rótulos' },
  { key: 'surface', label: 'Cartão', hint: 'O fundo dos cartões' },
  { key: 'surfaceAlt', label: 'Cartão claro', hint: 'Cartões menores e campos' },
  { key: 'border', label: 'Borda', hint: 'Contornos e divisórias' },
  { key: 'accent', label: 'Destaque', hint: 'Botão principal e item ativo' },
  { key: 'onAccent', label: 'Sobre o destaque', hint: 'O texto em cima do destaque' },
  { key: 'accentAlt', label: 'Destaque 2', hint: 'Segunda cor de apoio' },
  { key: 'positive', label: 'Positivo', hint: 'Dinheiro que entrou' },
  { key: 'negative', label: 'Negativo', hint: 'Dinheiro que saiu' },
];

/**
 * Preenche a personalidade de um tema que não a tem.
 *
 * Um tema salvo antes desses tokens existirem chega só com cores. Adivinhar a
 * partir do `outlined` e do `radius` faz esse tema continuar parecido com o que
 * a pessoa escolheu, em vez de virar outro tema de repente. É o único lugar do
 * app que decide default de token — nenhuma tela usa `?? 'clean'`.
 */
export function resolveTokens(tokens: ThemeTokens): ResolvedTokens {
  const outlined = tokens.outlined;
  const radius = tokens.radius;
  return {
    ...tokens,
    style: tokens.style ?? (outlined ? 'bold' : 'clean'),
    shape: tokens.shape ?? (radius <= 8 ? 'sharp' : radius <= 18 ? 'medium' : 'round'),
    cardStyle: tokens.cardStyle ?? (outlined ? 'outline' : 'filled'),
    buttonStyle: tokens.buttonStyle ?? (outlined ? 'sticker' : 'solid'),
    iconStyle: tokens.iconStyle ?? 'glyph',
    navStyle: tokens.navStyle ?? 'floating',
    // O grid em perspectiva já era o fundo da Home antes desse token existir:
    // manter é o que faz um tema antigo continuar idêntico.
    backgroundStyle: tokens.backgroundStyle ?? 'grid',
    decorationStyle: tokens.decorationStyle ?? (outlined ? 'outline' : 'minimal'),
    density: tokens.density ?? 'regular',
    vibe: tokens.vibe ?? '',
  };
}

export function resolveTheme(theme: {
  id: number | string;
  name: string;
  isPreset: boolean;
  tokens: ThemeTokens;
}): Theme {
  return {
    id: theme.id,
    name: theme.name,
    isPreset: theme.isPreset,
    ...resolveTokens(theme.tokens),
  };
}

// ---------------------------------------------------------------------------
// Presets de fábrica (cópia local). Espelha `FACTORY_THEMES` do backend.
// ---------------------------------------------------------------------------

export const NOIR_TOKENS: ThemeTokens = {
  bg: '#050505',
  surface: '#0E0E0E',
  surfaceAlt: '#171717',
  border: '#333333',
  text: '#FFFFFF',
  textMuted: '#9A9A9A',
  accent: '#FFFFFF',
  onAccent: '#000000',
  accentAlt: '#FF2D2D',
  positive: '#FFFFFF',
  negative: '#FF2D2D',
  radius: 4,
  outlined: true,
  swatch: ['#FFFFFF', '#000000'],
  fontDisplay: 'Archivo_900Black_Italic',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_500Medium',
  style: 'bold',
  shape: 'sharp',
  cardStyle: 'outline',
  buttonStyle: 'sticker',
  iconStyle: 'geometric',
  navStyle: 'dock',
  backgroundStyle: 'plain',
  decorationStyle: 'outline',
  density: 'compact',
  vibe: 'seco',
};

export const CHERRY_TOKENS: ThemeTokens = {
  bg: '#FFF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#FFEBE2',
  border: '#F2D9CC',
  text: '#2A1310',
  textMuted: '#8B665C',
  accent: '#D81E45',
  onAccent: '#FFFFFF',
  accentAlt: '#FF8FA8',
  positive: '#1B8055',
  negative: '#D81E45',
  radius: 24,
  outlined: false,
  swatch: ['#D81E45', '#FFF7F2'],
  fontDisplay: 'SpaceGrotesk_700Bold',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_400Regular',
  style: 'playful',
  shape: 'round',
  cardStyle: 'filled',
  buttonStyle: 'solid',
  iconStyle: 'doodle',
  navStyle: 'floating',
  backgroundStyle: 'plain',
  decorationStyle: 'doodles',
  density: 'regular',
  vibe: 'doce',
};

export const ICE_TOKENS: ThemeTokens = {
  bg: '#FBFDFF',
  surface: '#F1F7FC',
  surfaceAlt: '#E6F0F8',
  border: '#D8E6F0',
  text: '#0E1D29',
  textMuted: '#66808F',
  accent: '#1E7FC4',
  onAccent: '#FFFFFF',
  accentAlt: '#8FCDEE',
  positive: '#128371',
  negative: '#CF4560',
  radius: 18,
  outlined: false,
  swatch: ['#1E7FC4', '#FBFDFF'],
  fontDisplay: 'SpaceGrotesk_500Medium',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_400Regular',
  style: 'clean',
  shape: 'medium',
  cardStyle: 'glass',
  buttonStyle: 'solid',
  iconStyle: 'glyph',
  navStyle: 'floating',
  backgroundStyle: 'plain',
  decorationStyle: 'none',
  density: 'roomy',
  vibe: 'limpo',
};

export const Y2K_TOKENS: ThemeTokens = {
  bg: '#D5DBE4',
  surface: '#EDF1F6',
  surfaceAlt: '#C0C9D7',
  border: '#9AA6B8',
  text: '#0A1230',
  textMuted: '#4E5B85',
  accent: '#1B36D8',
  onAccent: '#FFFFFF',
  accentAlt: '#67D4FF',
  positive: '#0A7F5E',
  negative: '#D01050',
  radius: 10,
  outlined: false,
  swatch: ['#C0C9D7', '#1B36D8'],
  fontDisplay: 'Anton_400Regular',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_500Medium',
  style: 'futuristic',
  shape: 'medium',
  cardStyle: 'filled',
  buttonStyle: 'glow',
  iconStyle: 'pixel',
  navStyle: 'dock',
  backgroundStyle: 'gradient',
  decorationStyle: 'glow',
  density: 'compact',
  vibe: 'chrome',
};

export const MATCHA_TOKENS: ThemeTokens = {
  bg: '#F6F4EA',
  surface: '#FFFDF6',
  surfaceAlt: '#EBEBDB',
  border: '#DCDECA',
  text: '#212719',
  textMuted: '#6F7A66',
  accent: '#4F8F5F',
  onAccent: '#FFFFFF',
  accentAlt: '#BCD6A4',
  positive: '#4F8F5F',
  negative: '#BC5A4C',
  radius: 26,
  outlined: false,
  swatch: ['#4F8F5F', '#F6F4EA'],
  fontDisplay: 'SpaceGrotesk_500Medium',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_400Regular',
  style: 'soft',
  shape: 'round',
  cardStyle: 'filled',
  buttonStyle: 'solid',
  iconStyle: 'doodle',
  navStyle: 'floating',
  backgroundStyle: 'plain',
  decorationStyle: 'minimal',
  density: 'roomy',
  vibe: 'calmo',
};

export const DIGITAL_TOKENS: ThemeTokens = {
  bg: '#05060E',
  surface: '#0B0D1A',
  surfaceAlt: '#121529',
  border: '#282E52',
  text: '#E9ECFF',
  textMuted: '#8189B5',
  accent: '#7C5CFC',
  onAccent: '#FFFFFF',
  accentAlt: '#22E0FF',
  positive: '#22E0FF',
  negative: '#FF4D8D',
  radius: 14,
  outlined: false,
  swatch: ['#7C5CFC', '#22E0FF'],
  fontDisplay: 'SpaceGrotesk_700Bold',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_400Regular',
  style: 'futuristic',
  shape: 'medium',
  cardStyle: 'line',
  buttonStyle: 'glow',
  iconStyle: 'geometric',
  navStyle: 'floating',
  backgroundStyle: 'grid',
  decorationStyle: 'glow',
  density: 'compact',
  vibe: 'neon',
};

/** Na mesma ordem do `FACTORY_THEMES` do backend. */
export const FACTORY_PRESETS: { name: string; tokens: ThemeTokens }[] = [
  { name: 'NOIR', tokens: NOIR_TOKENS },
  { name: 'CHERRY', tokens: CHERRY_TOKENS },
  { name: 'ICE', tokens: ICE_TOKENS },
  { name: 'Y2K', tokens: Y2K_TOKENS },
  { name: 'MATCHA', tokens: MATCHA_TOKENS },
  { name: 'DIGITAL', tokens: DIGITAL_TOKENS },
];

export const NOIR: Theme = resolveTheme({
  id: 'noir',
  name: 'NOIR',
  isPreset: true,
  tokens: NOIR_TOKENS,
});

/** Reserva local: o app pinta a primeira tela com isso, sem rede e sem sessão. */
export const FALLBACK_THEMES: Theme[] = FACTORY_PRESETS.map((preset) =>
  resolveTheme({ id: preset.name.toLowerCase(), name: preset.name, isPreset: true, tokens: preset.tokens }),
);

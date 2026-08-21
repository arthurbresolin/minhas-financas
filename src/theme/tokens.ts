/**
 * Um tema é uma paleta. Só isso.
 *
 * A versão anterior fazia o tema decidir também a forma do cartão, o desenho do
 * botão, o estilo do ícone, o fundo, a decoração, a densidade e três fontes.
 * Dava oito apps diferentes pra manter, e cada tela virava um `switch` em cima
 * de um eixo de personalidade. Trocar de tema agora troca a cor — o desenho do
 * app é um só, escrito uma vez.
 *
 * Os temas de verdade vivem no banco, por usuário (`/themes`). O que está aqui
 * embaixo é só a cópia local dos presets de fábrica: é com ela que o app pinta
 * a primeira tela, antes de qualquer resposta do servidor e mesmo sem rede.
 * Precisa ser igual ao `FACTORY_THEMES` do backend.
 */

/** As cores de um tema, como chegam da API. */
export type ThemeTokens = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  /** Segundo acento: barra do segundo pote, gráficos, gradientes. */
  accentAlt: string;
  positive: string;
  negative: string;
  /** As duas cores da bolinha na lista de temas. */
  swatch: [string, string];
};

/** Um tema como o app usa: as cores junto da identidade da linha. */
export type Theme = ThemeTokens & {
  id: number | string;
  name: string;
  isPreset: boolean;
};

/**
 * Forma e espaço não são mais tema.
 *
 * Um número só para o app inteiro. Se um dia isso precisar variar, vira token
 * de novo — mas variar por tema foi o que fez cada tela precisar perguntar
 * "que formato eu tenho hoje?".
 */
export const RADIUS = 16;

/**
 * As fontes, fixas.
 *
 * São a assinatura do desenho: trocar elas não muda a cor do app, muda o app.
 * Por isso saíram do tema — o tema muda a cor.
 */
export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  mono: 'IBMPlexMono_600SemiBold',
  sans: 'Inter_400Regular',
  condensed: 'Archivo_900Black_Italic',
  numeric: 'Anton_400Regular',
  hand: 'Caveat_700Bold',
} as const;

/**
 * Achata um tema vindo da API.
 *
 * Um tema salvo pela versão antiga chega com dezenas de campos de
 * personalidade (`cardStyle`, `density`, `fontDisplay`…). Aqui só as cores são
 * lidas; o resto é ignorado de propósito, então nenhum tema antigo quebra e
 * nenhuma migração é necessária.
 */
export function resolveTheme(theme: {
  id: number | string;
  name: string;
  isPreset: boolean;
  tokens: ThemeTokens;
}): Theme {
  const t = theme.tokens;
  return {
    id: theme.id,
    name: theme.name,
    isPreset: theme.isPreset,
    bg: t.bg,
    surface: t.surface,
    surfaceAlt: t.surfaceAlt,
    border: t.border,
    text: t.text,
    textMuted: t.textMuted,
    accent: t.accent,
    onAccent: t.onAccent,
    accentAlt: t.accentAlt,
    positive: t.positive,
    negative: t.negative,
    swatch: [t.swatch?.[0] ?? t.accent, t.swatch?.[1] ?? t.bg],
  };
}

// ---------------------------------------------------------------------------
// Presets de fábrica (cópia local). Espelha `FACTORY_THEMES` do backend.
// ---------------------------------------------------------------------------

export const PADRAO_TOKENS: ThemeTokens = {
  bg: '#0A0A0F',
  surface: '#14141C',
  surfaceAlt: '#1B1B26',
  border: '#23232E',
  text: '#F4F4F6',
  textMuted: '#8A8A99',
  accent: '#C6F24E',
  onAccent: '#0A0A0F',
  accentAlt: '#8B5CF6',
  positive: '#63D6A0',
  negative: '#FF6FB3',
  swatch: ['#CDFF46', '#8B5CF6'],
};

export const NEON_TOKENS: ThemeTokens = {
  bg: '#080B0A',
  surface: '#101613',
  surfaceAlt: '#161E1A',
  border: '#1C2622',
  text: '#EAF2EE',
  textMuted: '#5F6B65',
  accent: '#2BF58C',
  onAccent: '#04140B',
  accentAlt: '#8FE0B5',
  positive: '#2BF58C',
  negative: '#FF6FB3',
  swatch: ['#2BF58C', '#080B0A'],
};

export const NG_TOKENS: ThemeTokens = {
  bg: '#000000',
  surface: '#0A0A0A',
  surfaceAlt: '#141414',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textMuted: '#8A8A8A',
  accent: '#FFFFFF',
  onAccent: '#000000',
  accentAlt: '#B14BFF',
  positive: '#00E676',
  negative: '#FF4D6D',
  swatch: ['#FFFFFF', '#000000'],
};

export const CYBERPUNK_TOKENS: ThemeTokens = {
  bg: '#07060D',
  surface: '#0A0512',
  surfaceAlt: '#120A1F',
  border: '#241640',
  text: '#F0E9FF',
  textMuted: '#8B7BB0',
  accent: '#FF2E88',
  onAccent: '#0A0512',
  accentAlt: '#22E0FF',
  positive: '#22E0FF',
  negative: '#FF2E88',
  swatch: ['#FF2E88', '#22E0FF'],
};

export const DOCE_TOKENS: ThemeTokens = {
  bg: '#1A1622',
  surface: '#241C2E',
  surfaceAlt: '#2E2439',
  border: '#3A2740',
  text: '#FBF3FF',
  textMuted: '#A99BB8',
  accent: '#FFB3D9',
  onAccent: '#241C2E',
  accentAlt: '#C9B8FF',
  positive: '#B6F5D8',
  negative: '#FF8FA8',
  swatch: ['#FFB3D9', '#C9B8FF'],
};

export const VAPORWAVE_TOKENS: ThemeTokens = {
  bg: '#140A20',
  surface: '#2A0F2E',
  surfaceAlt: '#3A1642',
  border: '#4A2456',
  text: '#FDEBFF',
  textMuted: '#A87FB8',
  accent: '#FF6EC7',
  onAccent: '#2A1140',
  accentAlt: '#FFB86C',
  positive: '#FFB86C',
  negative: '#FF5C8A',
  swatch: ['#FF6EC7', '#FFB86C'],
};

export const STREETWEAR_TOKENS: ThemeTokens = {
  bg: '#0E0E0C',
  surface: '#17170F',
  surfaceAlt: '#1F1F16',
  border: '#33331F',
  text: '#F7F5EC',
  textMuted: '#8F8C7A',
  accent: '#F5C542',
  onAccent: '#1A1A1A',
  accentAlt: '#E0653A',
  positive: '#F5C542',
  negative: '#E0653A',
  swatch: ['#F5C542', '#1A1A1A'],
};

export const GAMER_TOKENS: ThemeTokens = {
  bg: '#060A14',
  surface: '#0C1322',
  surfaceAlt: '#121C30',
  border: '#1D2B47',
  text: '#E8F4FF',
  textMuted: '#7590B5',
  accent: '#22E0FF',
  onAccent: '#060A14',
  accentAlt: '#7C5CFC',
  positive: '#22E0FF',
  negative: '#FF5C7A',
  swatch: ['#22E0FF', '#7C5CFC'],
};

/** Na mesma ordem do `FACTORY_THEMES` do backend. */
export const FACTORY_PRESETS: { name: string; tokens: ThemeTokens }[] = [
  { name: 'Padrão', tokens: PADRAO_TOKENS },
  { name: 'Neón', tokens: NEON_TOKENS },
  { name: 'NG preto & branco', tokens: NG_TOKENS },
  { name: 'Cyberpunk', tokens: CYBERPUNK_TOKENS },
  { name: 'Doce', tokens: DOCE_TOKENS },
  { name: 'Vaporwave', tokens: VAPORWAVE_TOKENS },
  { name: 'Streetwear', tokens: STREETWEAR_TOKENS },
  { name: 'Gamer', tokens: GAMER_TOKENS },
];

/** O tema que pinta a primeira tela, antes de qualquer resposta do servidor. */
export const NOIR: Theme = resolveTheme({
  id: 'padrao',
  name: 'Padrão',
  isPreset: true,
  tokens: PADRAO_TOKENS,
});

/** Reserva local: o app pinta a primeira tela com isso, sem rede e sem sessão. */
export const FALLBACK_THEMES: Theme[] = FACTORY_PRESETS.map((preset) =>
  resolveTheme({ id: preset.name.toLowerCase(), name: preset.name, isPreset: true, tokens: preset.tokens }),
);

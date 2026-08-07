/**
 * Um tema é um conjunto de tokens, não um par claro/escuro fixo.
 *
 * No Bloco 1 existe só o "Neón" e ele é lido direto daqui. No Bloco 2 os temas
 * passam a vir do banco (o usuário edita cada cor), e o único arquivo que muda
 * é o provider — os componentes já consomem `useTheme()` sem saber a origem.
 */
export type ThemeTokens = {
  name: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  positive: string;
  negative: string;
  radius: number;
};

export const NEON: ThemeTokens = {
  name: 'Neón',
  bg: '#0A0E0D',
  surface: '#141A19',
  surfaceAlt: '#1B2322',
  border: '#242E2C',
  text: '#F0F4F2',
  textMuted: '#7B8A87',
  accent: '#2BF58C',
  onAccent: '#04150C',
  positive: '#2BF58C',
  negative: '#FF6B6B',
  radius: 20,
};

export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  mono: 'IBMPlexMono_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
} as const;

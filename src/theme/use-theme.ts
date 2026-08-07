import { NEON, type ThemeTokens } from '@/theme/tokens';

/**
 * Ponto único de acesso ao tema.
 *
 * Nenhum componente importa NEON diretamente — todos passam por aqui. É o que
 * permite trocar a fonte dos tokens (hoje constante, no Bloco 2 vinda do banco
 * e editável) sem tocar em nenhuma tela.
 */
export function useTheme(): ThemeTokens {
  return NEON;
}

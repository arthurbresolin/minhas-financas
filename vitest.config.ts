import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Testes da lógica pura: `src/lib` e `src/theme`.
 *
 * Não há jsdom nem react-native aqui de propósito. O que precisa de teste
 * automático neste app é a conta de dinheiro (centavos, tempo de trabalho) e a
 * conta de cor (contraste do rótulo sobre o accent, o tema antigo que ainda
 * carrega). Nenhuma das duas sabe o que é um componente, e testá-las não deve
 * exigir montar um.
 *
 * `src/theme/use-theme.tsx` fica de fora por ser componente — o que dele vale
 * testar (o `resolveTheme`) mora em `tokens.ts`, que é puro.
 *
 * O que é visual continua sendo verificado abrindo o app.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    include: ['src/lib/**/*.test.ts', 'src/theme/**/*.test.ts'],
  },
});

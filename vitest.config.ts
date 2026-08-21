import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Testes só da lógica pura de `src/lib`.
 *
 * Não há jsdom nem react-native aqui de propósito: o que precisa de teste
 * automático neste app é a conta de dinheiro — a calculadora do teclado, a
 * conversão de centavos, o tempo de trabalho. Essas funções não sabem o que é
 * um componente, e testá-las não deve exigir montar um.
 *
 * O que é visual continua sendo verificado abrindo o app.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    include: ['src/lib/**/*.test.ts'],
  },
});

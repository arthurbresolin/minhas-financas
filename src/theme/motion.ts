/**
 * As durações das animações, em ms.
 *
 * Ficam juntas de propósito: é o que garante que a barra de uma meta e a de
 * uma categoria acabem no mesmo ritmo, em vez de cada tela escolher um número.
 *
 * O movimento aqui é só o básico — o que mostra de onde um número veio: o
 * saldo contando, a barra preenchendo, um cartão aparecendo, a gaveta subindo.
 * A atmosfera que existia antes (orbe flutuando, pulso, shimmer, gradiente
 * andando) saiu junto com os eixos de personalidade do tema.
 *
 * O único interruptor que desliga isso é o "Reduzir movimento" do próprio
 * aparelho — uma escolha de acessibilidade da pessoa. Por isso ele vive nos
 * componentes (`useReducedMotion`), e não aqui.
 */
export const DURATION = {
  /** Saldo contando de zero até o valor. */
  count: 900,
  /** Barra de progresso preenchendo. */
  fill: 1100,
  /** Uma entrada suave (cartão, número, título). */
  pop: 420,
  /** Bottom sheet subindo. */
  rise: 380,
} as const;

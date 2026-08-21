import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DURATION } from '@/theme/motion';

/**
 * As três peças de movimento do app.
 *
 * São só as que carregam informação: o saldo contando mostra de onde o número
 * veio, a barra preenchendo mostra quanto ela andou, o `Rise` diz que a gaveta
 * chegou. As peças de ambiente que existiam aqui (pulso, orbe flutuando,
 * shimmer, "+" quicando, confete, anel) saíram com os eixos de personalidade do
 * tema — eram atmosfera, não informação.
 *
 * Nenhuma pergunta nada ao tema: o tema é cor. Todas param quando o aparelho
 * está em "Reduzir movimento", que é uma escolha da pessoa.
 *
 * O truque que se repete aqui é que o estado final é sempre o valor certo — a
 * animação só é o caminho até ele. Um aparelho fraco ou uma animação
 * interrompida no meio nunca deixam a tela num estado errado.
 */

// ---------------------------------------------------------------------------
// Número contando
// ---------------------------------------------------------------------------

/**
 * O valor subindo de zero até o alvo.
 *
 * Roda em JS com `requestAnimationFrame` em vez de no worklet porque o que
 * anima aqui é *texto formatado* ("R$ 4.812,00"), não um estilo: teria que
 * voltar pro JS a cada quadro de qualquer jeito. São ~54 quadros numa tela só.
 *
 * A curva é `easeOutCubic`: começa rápido e freia no fim, que é o que faz o
 * número parecer que "chegou" em vez de ser cortado.
 */
export function useCountUp(target: number): number {
  const reduzido = useReducedMotion();
  const animate = !reduzido;
  const [value, setValue] = useState(animate ? 0 : target);
  const frame = useRef<number | null>(null);
  // O valor de onde a contagem parte: mudar de período recontando desde zero
  // pisca a tela toda, então a segunda contagem em diante sai do valor atual.
  const from = useRef(0);

  useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }
    const start = Date.now();
    const origin = from.current;
    const run = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION.count);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(origin + (target - origin) * eased));
      if (t < 1) frame.current = requestAnimationFrame(run);
      else from.current = target;
    };
    frame.current = requestAnimationFrame(run);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      // Interrompido no meio (a pessoa saiu da tela), o valor guardado é o
      // alvo: voltar não recomeça de um número que já não é verdade.
      from.current = target;
    };
  }, [target, animate]);

  return value;
}

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

/** Sobe de baixo. O bottom sheet de lançar. */
export function Rise({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const on = !useReducedMotion();
  const t = useSharedValue(on ? 0 : 1);

  useEffect(() => {
    if (!on) return;
    t.value = withTiming(1, { duration: DURATION.rise, easing: Easing.out(Easing.cubic) });
  }, [on, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 320 }],
  }));

  if (!on) return <View style={style}>{children}</View>;
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Uma barra que preenche até a proporção dada.
 *
 * Anima da esquerda com `scaleX` em vez de `width` porque largura em
 * porcentagem faz o React Native remedir o layout a cada quadro; escala é só
 * transformação e roda na thread de UI.
 */
export function Fill({
  progress,
  color,
  track,
  height = 6,
  delay = 0,
  radius,
}: {
  progress: number;
  color: string;
  track: string;
  height?: number;
  delay?: number;
  radius?: number;
}) {
  const on = !useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));
  const t = useSharedValue(on ? 0 : target);
  const round = radius ?? height / 2;

  useEffect(() => {
    if (!on) {
      t.value = target;
      return;
    }
    t.value = withDelay(delay, withTiming(target, { duration: DURATION.fill, easing: Easing.out(Easing.cubic) }));
  }, [on, target, delay, t]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: t.value }] }));

  return (
    <View style={{ height, borderRadius: round, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height, borderRadius: round, backgroundColor: color, width: '100%', transformOrigin: 'left' },
          animated,
        ]}
      />
    </View>
  );
}

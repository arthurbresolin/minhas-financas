import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

/**
 * O chão em perspectiva que aparece atrás do conteúdo na Home.
 *
 * No design da web isso é um `transform: perspective()` com máscara. Em React
 * Native não existe máscara de CSS, então o mesmo efeito é desenhado à mão: as
 * linhas horizontais se aproximam conforme sobem (divisão por profundidade) e
 * a opacidade cai junto, que é o que a máscara fazia.
 */
export function Grid3D({ color, height = 190 }: { color: string; height?: number }) {
  const rows = 16;
  const columns = 14;
  const horizon = 0;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {Array.from({ length: rows }, (_, i) => {
          const y = 100 / (1 + i * 0.42);
          return (
            <Line
              key={`h${i}`}
              x1={0}
              y1={y}
              x2={100}
              y2={y}
              stroke={color}
              strokeWidth={0.5}
              opacity={0.28 * (y / 100)}
            />
          );
        })}
        {Array.from({ length: columns + 1 }, (_, i) => {
          // Todas as verticais miram o mesmo ponto de fuga no centro do horizonte.
          const spread = 3.2;
          const x = 50 + (i - columns / 2) * ((100 / columns) * spread);
          return (
            <Line
              key={`v${i}`}
              x1={x}
              y1={100}
              x2={50}
              y2={horizon}
              stroke={color}
              strokeWidth={0.5}
              opacity={0.16}
            />
          );
        })}
      </Svg>
    </View>
  );
}

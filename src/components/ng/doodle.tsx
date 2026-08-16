import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * Os rabiscos do design NG.cash.
 *
 * São desenhos de linha, não emoji: o traço acompanha a cor do texto do tema,
 * então o mesmo desenho funciona no preto e branco e nos packs coloridos. São
 * rascunhos em SVG — quando chegarem as artes finais da ilustradora, só este
 * arquivo muda.
 */
export type DoodleName = 'passaro' | 'viagem' | 'brilho' | 'cofrinho' | 'fantasma' | 'olhos';

type Props = {
  name: DoodleName;
  size?: number;
  color: string;
  /** Traço mais grosso quando o desenho é pequeno, pra não sumir. */
  strokeWidth?: number;
};

export function Doodle({ name, size = 34, color, strokeWidth = 2 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  if (name === 'passaro') {
    return (
      <Svg viewBox="0 0 40 40" width={size} height={size}>
        <Path d="M6 22 Q10 8 20 10 Q30 12 30 22 Q30 32 20 32 Q9 32 6 22Z" {...common} />
        <Path d="M28 16 L37 12 L33 19" {...common} />
        <Circle cx="24" cy="18" r="1.4" fill={color} />
        <Path d="M12 32 L10 38 M22 33 L23 39" {...common} />
      </Svg>
    );
  }

  if (name === 'viagem') {
    return (
      <Svg viewBox="0 0 40 40" width={size} height={size}>
        <Path d="M6 26 Q20 14 34 26" {...common} />
        <Ellipse cx="20" cy="27" rx="15" ry="5" {...common} />
        <Path d="M17 6 L20 14 L23 6" {...common} />
      </Svg>
    );
  }

  if (name === 'brilho') {
    return (
      <Svg viewBox="0 0 40 40" width={size} height={size}>
        <Path d="M20 6 L23 15 L20 12 L17 15Z" {...common} />
        <Path d="M8 20 L13 22 L9 25" {...common} />
        <Path d="M32 20 L27 22 L31 25" {...common} />
        <Path d="M20 30 L20 24" {...common} />
      </Svg>
    );
  }

  if (name === 'fantasma') {
    return (
      <Svg viewBox="0 0 40 40" width={size} height={size}>
        <Path d="M10 30 V16 Q10 8 20 8 Q30 8 30 16 V30 L26 27 L23 30 L20 27 L17 30 L14 27Z" {...common} />
        <Circle cx="16" cy="18" r="1.4" fill={color} />
        <Circle cx="24" cy="18" r="1.4" fill={color} />
      </Svg>
    );
  }

  if (name === 'olhos') {
    return (
      <Svg viewBox="0 0 40 40" width={size} height={size}>
        <Ellipse cx="14" cy="18" rx="6" ry="8" {...common} />
        <Ellipse cx="26" cy="18" rx="6" ry="8" {...common} />
        <Circle cx="14" cy="19" r="2" fill={color} />
        <Circle cx="26" cy="19" r="2" fill={color} />
      </Svg>
    );
  }

  // cofrinho — o desenho grande da tela de pote, com a moeda caindo
  return (
    <Svg viewBox="0 0 100 100" width={size} height={size}>
      <Ellipse cx="50" cy="46" rx="26" ry="10" {...common} />
      <Ellipse cx="50" cy="46" rx="12" ry="4.5" {...common} />
      <Path d="M39 50 Q50 62 61 50" {...common} />
      <Path d="M50 51 L50 74" {...common} strokeDasharray="1 3.5" opacity={0.7} />
      <Path d="M75 10 l1.5 -5 1.5 5 -3 1.5 3 1.5" {...common} />
    </Svg>
  );
}

import { FACTORY_PRESETS, FALLBACK_THEMES, NOIR, resolveTheme, type ThemeTokens } from '@/theme/tokens';

/**
 * O tema que chega da API.
 *
 * `resolveTheme` é a única porta de entrada de cor no app. O que ele precisa
 * garantir é que um tema salvo na versão em que o tema era uma "skin" — com
 * `cardStyle`, `density`, três fontes e mais uma dúzia de campos — continue
 * carregando, e que nada daquilo vaze pras telas.
 */

/** Um tema como o banco guardou antes da simplificação. Existe linha assim. */
const TOKENS_ANTIGOS = {
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
  radius: 6,
  outlined: true,
  fontDisplay: 'SpaceGrotesk_700Bold',
  fontMono: 'IBMPlexMono_600SemiBold',
  fontSans: 'Inter_400Regular',
  cardStyle: 'outline',
  buttonStyle: 'sticker',
  density: 'compact',
  vibe: 'seco',
} as unknown as ThemeTokens;

describe('resolveTheme', () => {
  it('carrega um tema antigo sem quebrar', () => {
    const tema = resolveTheme({ id: 7, name: 'Meu antigo', isPreset: false, tokens: TOKENS_ANTIGOS });

    expect(tema.accent).toBe('#FFFFFF');
    expect(tema.bg).toBe('#000000');
    expect(tema.name).toBe('Meu antigo');
    expect(tema.isPreset).toBe(false);
  });

  it('descarta os campos de personalidade em vez de repassá-los', () => {
    // Se eles vazassem, uma tela poderia voltar a olhar `cardStyle` e o
    // `switch` por eixo de personalidade renasceria sem ninguém decidir isso.
    const tema = resolveTheme({ id: 7, name: 'Meu antigo', isPreset: false, tokens: TOKENS_ANTIGOS });

    expect(tema).not.toHaveProperty('cardStyle');
    expect(tema).not.toHaveProperty('density');
    expect(tema).not.toHaveProperty('fontDisplay');
    expect(tema).not.toHaveProperty('radius');
    expect(tema).not.toHaveProperty('outlined');
  });

  it('entrega exatamente as cores que as telas usam', () => {
    const tema = resolveTheme({ id: 1, name: 'x', isPreset: true, tokens: TOKENS_ANTIGOS });

    expect(Object.keys(tema).sort()).toEqual(
      [
        'accent', 'accentAlt', 'bg', 'border', 'id', 'isPreset', 'name',
        'negative', 'onAccent', 'positive', 'surface', 'surfaceAlt', 'swatch',
        'text', 'textMuted',
      ].sort(),
    );
  });

  it('inventa a amostra quando ela não veio', () => {
    // Sem isso a lista de temas renderiza uma bolinha `undefined`, que no
    // React Native é uma bolinha invisível — o tema some da lista.
    const { swatch: _, ...semAmostra } = TOKENS_ANTIGOS;
    const tema = resolveTheme({
      id: 1, name: 'x', isPreset: true, tokens: semAmostra as ThemeTokens,
    });

    expect(tema.swatch).toEqual(['#FFFFFF', '#000000']);
  });
});

describe('o catálogo de fábrica', () => {
  it('tem os oito packs, e o primeiro é o padrão do app', () => {
    expect(FACTORY_PRESETS).toHaveLength(8);
    expect(FALLBACK_THEMES).toHaveLength(8);
    expect(NOIR.name).toBe(FACTORY_PRESETS[0].name);
  });

  it('não repete nome', () => {
    // `sync_presets` casa preset por NOME. Nome repetido faria o backend
    // apagar e recriar linha em cima de linha.
    const nomes = FACTORY_PRESETS.map((p) => p.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('dá as onze cores e a amostra em todos os packs', () => {
    const obrigatorias = [
      'bg', 'surface', 'surfaceAlt', 'border', 'text', 'textMuted',
      'accent', 'onAccent', 'accentAlt', 'positive', 'negative',
    ] as const;

    for (const { name, tokens } of FACTORY_PRESETS) {
      for (const cor of obrigatorias) {
        expect(`${name}.${cor} = ${tokens[cor]}`).toMatch(/= #[0-9a-fA-F]{6}$/);
      }
      expect(tokens.swatch).toHaveLength(2);
    }
  });
});

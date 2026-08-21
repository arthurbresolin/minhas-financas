import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { activateTheme, listThemes, type ApiTheme } from '@/api';
import { useSession } from '@/hooks/use-session';
import { FALLBACK_THEMES, NOIR, resolveTheme, type Theme } from '@/theme/tokens';

/**
 * Ponto único de acesso ao tema.
 *
 * Nenhum componente importa uma cor direto — todos passam por `useTheme()`. É
 * o que permite a lista vir do servidor e o app inteiro repintar sem que
 * nenhuma tela saiba de onde as cores vieram.
 */
type ThemeValue = {
  theme: Theme;
  themes: Theme[];
  setTheme: (id: number | string) => void;
};

const ThemeContext = createContext<ThemeValue>({
  theme: NOIR,
  themes: FALLBACK_THEMES,
  setTheme: () => {},
});

/**
 * Achata a linha da API no formato plano que as telas consomem.
 *
 * Passa pelo `resolveTheme` porque um tema salvo na versão em que o tema era
 * uma "skin" chega com dezenas de campos que não existem mais — é aqui que
 * eles são descartados, uma vez só, em vez de vazarem pras telas.
 */
export function fromApi(theme: ApiTheme): Theme {
  return resolveTheme({
    id: theme.id,
    name: theme.name,
    isPreset: theme.is_preset,
    tokens: theme.tokens,
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [themes, setThemes] = useState<Theme[]>(FALLBACK_THEMES);
  const [activeId, setActiveId] = useState<number | string>(NOIR.id);

  const reload = useCallback(async () => {
    if (!user) {
      // Deslogado (tela de login) não tem tema no servidor pra buscar: fica no
      // preset local, que é o mesmo visual.
      setThemes(FALLBACK_THEMES);
      setActiveId(NOIR.id);
      return;
    }
    try {
      const list = (await listThemes()).map(fromApi);
      setThemes(list);
      // O `active_theme_id` do usuário manda; sem ele, o primeiro preset.
      const active = list.find((item) => item.id === user.active_theme_id);
      setActiveId(active?.id ?? list[0]?.id ?? NOIR.id);
    } catch {
      // Sem rede o app continua pintado — só não dá pra trocar de tema.
      setThemes(FALLBACK_THEMES);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setTheme = useCallback((id: number | string) => {
    // Pinta na hora e avisa o servidor depois: esperar a resposta faria a
    // troca de tema parecer travada, e o pior caso é a escolha não persistir.
    setActiveId(id);
    if (typeof id === 'number') {
      void activateTheme(id).catch(() => {});
    }
  }, []);

  const value = useMemo(() => {
    const theme = themes.find((item) => item.id === activeId) ?? themes[0] ?? NOIR;
    return { theme, themes, setTheme };
  }, [themes, activeId, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Para a lista de temas e o atalho da Home; as telas comuns usam `useTheme()`. */
export function useThemePicker() {
  const { theme, themes, setTheme } = useContext(ThemeContext);
  return { active: theme, themes, setTheme };
}

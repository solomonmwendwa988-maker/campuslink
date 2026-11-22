import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { useLocalState } from '../../hooks/useLocalState';

export type ThemeMode = 'light' | 'dark' | 'system';
type ThemeContextValue = { dark: boolean; mode: ThemeMode; setMode: (mode: ThemeMode) => void; setDark: (dark: boolean) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useLocalState<ThemeMode>('theme', 'light');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c1222' : '#10264F');
  }, [dark]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return <ThemeContext.Provider value={{ dark, mode, setMode, setDark: value => setMode(value ? 'dark' : 'light') }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

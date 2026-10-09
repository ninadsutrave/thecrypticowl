import { StoreKeys, readRaw, writeRaw } from '../lib/localStore';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = readRaw(StoreKeys.darkMode);
      if (stored !== null) return stored === 'true';
      // First-time visitor — honour the OS colour-scheme preference.
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      writeRaw(StoreKeys.darkMode, String(isDark));
    } catch {
      /* localStorage unavailable (e.g. private browsing) */
    }
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDarkMode() {
  return useContext(DarkModeContext);
}

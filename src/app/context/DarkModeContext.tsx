import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('tco-dark');
      if (stored !== null) return stored === 'true';
      return false; // default to light mode
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tco-dark', String(isDark));
    } catch {}
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}

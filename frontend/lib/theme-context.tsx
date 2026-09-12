'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'obsidian' | 'midnight' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: { id: Theme; name: string; description: string; accentColor: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes: { id: Theme; name: string; description: string; accentColor: string }[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Gold',
    description: 'Classic luxury dark barbershop with warm gold accents',
    accentColor: '#f59e0b',
  },
  {
    id: 'midnight',
    name: 'Midnight Emerald',
    description: 'Deep modern dark aesthetic with crisp emerald accents',
    accentColor: '#10b981',
  },
  {
    id: 'light',
    name: 'Studio Light',
    description: 'Crisp, high-contrast daylight aesthetic with clean typography',
    accentColor: '#d97706',
  },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('obsidian');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('barber_theme') as Theme | null;
    if (saved && (saved === 'obsidian' || saved === 'midnight' || saved === 'light')) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('obsidian');
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove('theme-obsidian', 'theme-midnight', 'theme-light', 'dark', 'light');

    if (t === 'light') {
      root.classList.add('theme-light', 'light');
    } else if (t === 'midnight') {
      root.classList.add('theme-midnight', 'dark');
    } else {
      root.classList.add('theme-obsidian', 'dark');
    }
    root.setAttribute('data-theme', t);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('barber_theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

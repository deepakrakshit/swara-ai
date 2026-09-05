import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType =
  | 'dark'
  | 'light'
  | 'navy'
  | 'terminal'
  | 'amber'
  | 'crimson'
  | 'nordic'
  | 'forest';

export type AccentColorType =
  | 'emerald'
  | 'purple'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'mono';

export type DensityType = 'compact' | 'normal' | 'spacious';

export const ACCENT_PALETTE: Record<AccentColorType, { name: string; hex: string; glow: string }> = {
  emerald: { name: 'Emerald', hex: '#10a37f', glow: 'rgba(16, 163, 127, 0.25)' },
  purple: { name: 'Purple', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.25)' },
  blue: { name: 'Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)' },
  amber: { name: 'Amber', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
  rose: { name: 'Rose', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)' },
  cyan: { name: 'Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.25)' },
  orange: { name: 'Orange', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.25)' },
  mono: { name: 'Monochrome', hex: '#94a3b8', glow: 'rgba(148, 163, 184, 0.2)' },
};

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  accentColor: AccentColorType;
  setAccentColor: (accent: AccentColorType) => void;
  density: DensityType;
  setDensity: (density: DensityType) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  strictAirGap: boolean;
  setStrictAirGap: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('swara_theme') as ThemeType) || 'dark';
  });

  const [accentColor, setAccentColorState] = useState<AccentColorType>(() => {
    return (localStorage.getItem('swara_accent') as AccentColorType) || 'purple';
  });

  const [density, setDensityState] = useState<DensityType>(() => {
    return (localStorage.getItem('swara_density') as DensityType) || 'normal';
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const swaraVal = localStorage.getItem('swara_sound');
    return swaraVal !== null ? swaraVal !== 'false' : true;
  });

  const [strictAirGap, setStrictAirGapState] = useState<boolean>(() => {
    const swaraVal = localStorage.getItem('swara_strict_airgap');
    return swaraVal !== null ? swaraVal !== 'false' : true;
  });

  const isDark = theme !== 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('swara_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', accentColor);
    const colorInfo = ACCENT_PALETTE[accentColor] || ACCENT_PALETTE.purple;
    root.style.setProperty('--accent-primary', colorInfo.hex);
    root.style.setProperty('--accent-glow', colorInfo.glow);
    localStorage.setItem('swara_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', density);
    localStorage.setItem('swara_density', density);
  }, [density]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const toggleDarkMode = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setAccentColor = (newAccent: AccentColorType) => {
    setAccentColorState(newAccent);
  };

  const setDensity = (newDensity: DensityType) => {
    setDensityState(newDensity);
  };

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    localStorage.setItem('swara_sound', String(val));
  };

  const setStrictAirGap = (val: boolean) => {
    setStrictAirGapState(val);
    localStorage.setItem('swara_strict_airgap', String(val));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        toggleDarkMode,
        accentColor,
        setAccentColor,
        density,
        setDensity,
        soundEnabled,
        setSoundEnabled,
        strictAirGap,
        setStrictAirGap,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

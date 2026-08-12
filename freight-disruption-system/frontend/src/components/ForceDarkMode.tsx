// frontend/src/components/ForceDarkMode.tsx
// Wrapper that forces dark mode on mount and restores previous theme on unmount.
// Uses ThemeContext to properly coordinate with the theme system.
import React, { useEffect, useRef } from 'react';
import { useTheme, Theme } from '@/shared/context/ThemeContext';

export const ForceDarkMode: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const previousTheme = useRef<Theme>(theme);
  const hasSetRef = useRef(false);

  useEffect(() => {
    // Save the current theme only on first mount
    if (!hasSetRef.current) {
      previousTheme.current = theme;
      hasSetRef.current = true;
    }

    // Force dark mode through the context (not DOM)
    if (theme !== 'dark') {
      setTheme('dark');
    }

    return () => {
      // Restore the previous theme when leaving these pages
      const saved = previousTheme.current;
      if (saved && saved !== 'dark') {
        setTheme(saved);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
};

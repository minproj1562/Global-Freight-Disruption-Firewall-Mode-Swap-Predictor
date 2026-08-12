// frontend/src/components/ForceDarkMode.tsx
// Wrapper that forces dark mode on mount and restores previous theme on unmount.
// Used for Landing, Login, Register pages that should always appear in dark mode.
import { useEffect } from 'react';

export const ForceDarkMode: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');

    // Force dark mode
    if (!hadDark) html.classList.add('dark');

    return () => {
      // Restore previous state when leaving these pages
      if (!hadDark) html.classList.remove('dark');
    };
  }, []);

  return <>{children}</>;
};

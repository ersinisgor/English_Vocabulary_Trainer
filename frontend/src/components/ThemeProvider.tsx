'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/store/preferences.store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferences((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { usePreferences } from '@/store/preferences.store';
import { authApi } from '@/lib/api/auth';
import { useT } from '@/lib/i18n';

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const t = useT(language);

  useEffect(() => {
    if (!accessToken) { router.push('/login'); return; }
    if (!user) {
      authApi.me()
        .then((u) => setAuth(u, accessToken))
        .catch(() => { clearAuth(); router.push('/login'); });
    }
  }, [accessToken]);

  if (!accessToken) return null;

  const navItems = [
    { href: '/words', label: t.nav.words },
    { href: '/import', label: t.nav.import },
    { href: '/exercises', label: t.nav.exercises },
  ];

  const handleLogout = async () => {
    try { await authApi.logout(); } finally { clearAuth(); router.push('/login'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Nav */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-4 text-base tracking-tight">
              ✦ VocabTrainer
            </span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              {(['tr', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    language === lang
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {t.lang[lang]}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`}
              >
                <SunIcon /><span>{t.theme.light}</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`}
              >
                <MoonIcon /><span>{t.theme.dark}</span>
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
            <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded"
            >
              {t.nav.logout}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

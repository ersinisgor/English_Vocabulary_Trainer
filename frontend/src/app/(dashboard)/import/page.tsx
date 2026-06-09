'use client';

import { useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

interface ImportError { wordNo: number; meaningOrder?: number; field: string; message: string; }
interface ImportResult {
  totalWords: number; totalMeanings: number; totalSplittedMeanings: number;
  totalExamples: number; totalTags: number; errors: ImportError[];
}

export default function ImportPage() {
  const { language } = usePreferences();
  const t = useT(language).import;

  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Lütfen bir dosya seçin'); return; }
    setError(''); setResult(null); setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/import/words', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">{t.title}</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{t.desc}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
            className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 cursor-pointer"
          />
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            {loading ? t.importing : t.importBtn}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">{t.result}</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: t.word, value: result.totalWords },
              { label: t.meaning, value: result.totalMeanings },
              { label: t.example, value: result.totalExamples },
              { label: t.tag, value: result.totalTags },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">{result.errors.length} {t.errors}</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded p-2">
                    #{e.wordNo}{e.meaningOrder ? `, anlam #${e.meaningOrder}` : ''}: {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

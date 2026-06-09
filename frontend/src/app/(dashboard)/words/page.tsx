'use client';

import { useEffect, useState, useCallback } from 'react';
import { wordsApi, Word, WordsQuery } from '@/lib/api/words';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

const POS_TR: Record<string, string> = {
  NOUN: 'İsim', VERB: 'Fiil', ADJECTIVE: 'Sıfat', ADVERB: 'Zarf',
  PHRASAL_VERB: 'Phrasal Verb', IDIOM: 'Deyim', EXPRESSION: 'İfade',
};
const POS_EN: Record<string, string> = {
  NOUN: 'Noun', VERB: 'Verb', ADJECTIVE: 'Adjective', ADVERB: 'Adverb',
  PHRASAL_VERB: 'Phrasal Verb', IDIOM: 'Idiom', EXPRESSION: 'Expression',
};

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  A2: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  B1: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  B2: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  C1: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  C2: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

export default function WordsPage() {
  const { language } = usePreferences();
  const t = useT(language);
  const POS = language === 'tr' ? POS_TR : POS_EN;

  const [words, setWords] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const limit = 20;

  const fetchWords = useCallback(async (query: WordsQuery) => {
    setLoading(true);
    try {
      const result = await wordsApi.getAll(query);
      setWords(result.data);
      setTotal(result.meta.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords({ page, limit, search: search || undefined });
  }, [page, search]);

  const totalPages = Math.ceil(total / limit);
  const allOnPageSelected = words.length > 0 && words.every((w) => selected.has(w.id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected((prev) => { const s = new Set(prev); words.forEach((w) => s.delete(w.id)); return s; });
    } else {
      setSelected((prev) => { const s = new Set(prev); words.forEach((w) => s.add(w.id)); return s; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(t.words.confirmDeleteSelected)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => wordsApi.delete(id)));
      fetchWords({ page, limit, search: search || undefined });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(t.words.confirmDeleteAll)) return;
    setDeleting(true);
    try {
      // Fetch all word IDs then delete
      const all = await wordsApi.getAll({ limit: 1000 });
      await Promise.all(all.data.map((w) => wordsApi.delete(w.id)));
      fetchWords({ page: 1, limit });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex-1 min-w-0">
          {t.words.title}
          <span className="ml-2 text-base font-normal text-gray-400 dark:text-slate-500">({total})</span>
        </h1>

        <input
          type="text"
          placeholder={t.words.search}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            <TrashIcon />
            {t.words.deleteSelected} ({selected.size})
          </button>
        )}

        <button
          onClick={handleDeleteAll}
          disabled={deleting || total === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
        >
          <TrashIcon />
          {t.words.deleteAll}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.words.loading}</div>
      ) : words.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          {search ? t.words.noResults : t.words.empty}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t.words.colWord}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t.words.colType}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t.words.colLevel}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">{t.words.colAdded}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {words.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => toggleOne(w.id)}
                  className={`cursor-pointer transition-colors ${
                    selected.has(w.id)
                      ? 'bg-indigo-50 dark:bg-indigo-500/5'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(w.id)}
                      onChange={() => toggleOne(w.id)}
                      className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{w.word}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{POS[w.partOfSpeech] ?? w.partOfSpeech}</td>
                  <td className="px-4 py-3">
                    {w.level ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${LEVEL_COLORS[w.level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {w.level}
                      </span>
                    ) : <span className="text-gray-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs hidden sm:table-cell">
                    {new Date(w.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm(t.words.confirmDeleteSelected)) wordsApi.delete(w.id).then(() => fetchWords({ page, limit, search: search || undefined })); }}
                      className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Sil"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-5">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {t.words.prev}
          </button>
          <span className="px-3 py-1 text-sm text-gray-500 dark:text-slate-400">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {t.words.next}
          </button>
        </div>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

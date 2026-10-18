'use client';

import { useEffect, useState } from 'react';
import { foldersApi, Folder } from '@/lib/api/folders';
import {
  wordListsApi,
  WordList,
  WordListWithItems,
} from '@/lib/api/word-lists';
import { wordsApi, Word } from '@/lib/api/words';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

export default function ListsPage() {
  const { language } = usePreferences();
  const t = useT(language).lists;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [lists, setLists] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(true);

  const [folderName, setFolderName] = useState('');
  const [listName, setListName] = useState('');
  const [listFolderId, setListFolderId] = useState('');

  const [managedList, setManagedList] = useState<WordListWithItems | null>(null);

  const reload = async () => {
    const [f, l] = await Promise.all([foldersApi.list(), wordListsApi.list()]);
    setFolders(f);
    setLists(l);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const createFolder = async () => {
    if (!folderName.trim()) return;
    await foldersApi.create(folderName.trim());
    setFolderName('');
    reload();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm(t.confirmDeleteFolder)) return;
    await foldersApi.remove(id);
    reload();
  };

  const createList = async () => {
    if (!listName.trim()) return;
    await wordListsApi.create({
      name: listName.trim(),
      folderId: listFolderId || undefined,
    });
    setListName('');
    setListFolderId('');
    reload();
  };

  const deleteList = async (id: string) => {
    if (!confirm(t.confirmDeleteList)) return;
    await wordListsApi.remove(id);
    reload();
  };

  const openManager = async (id: string) => {
    const full = await wordListsApi.get(id);
    setManagedList(full);
  };

  if (loading)
    return (
      <div className="text-center py-16 text-gray-400 dark:text-slate-500">
        {t.loading}
      </div>
    );

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        {t.title}
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Folders */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.foldersTitle}
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              placeholder={t.newFolder}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
            />
            <button
              onClick={createFolder}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              {t.create}
            </button>
          </div>
          {folders.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t.noFolders}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {folders.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-sm"
                >
                  <span className="text-gray-800 dark:text-slate-200">
                    📁 {f.name}
                  </span>
                  <button
                    onClick={() => deleteFolder(f.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    {t.delete}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Lists */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.listsTitle}
          </h2>
          <div className="space-y-2 mb-4">
            <input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={t.newList}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
            />
            <div className="flex gap-2">
              <select
                value={listFolderId}
                onChange={(e) => setListFolderId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-slate-300"
              >
                <option value="">{t.selectFolder}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                onClick={createList}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                {t.create}
              </button>
            </div>
          </div>
          {lists.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t.noLists}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lists.map((l) => {
                const folder = folders.find((f) => f.id === l.folderId);
                return (
                  <li
                    key={l.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-sm"
                  >
                    <span className="text-gray-800 dark:text-slate-200">
                      📑 {l.name}
                      <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
                        {folder ? `· ${folder.name}` : `· ${t.noFolder}`}
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openManager(l.id)}
                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
                      >
                        {t.manageWords}
                      </button>
                      <button
                        onClick={() => deleteList(l.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {managedList && (
        <ListWordsManager
          list={managedList}
          onChange={setManagedList}
          onClose={() => setManagedList(null)}
          t={t}
        />
      )}
    </div>
  );
}

function ListWordsManager({
  list,
  onChange,
  onClose,
  t,
}: {
  list: WordListWithItems;
  onChange: (l: WordListWithItems) => void;
  onClose: () => void;
  t: ReturnType<typeof useT>['lists'];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [searching, setSearching] = useState(false);

  const inList = new Set(list.items.map((i) => i.word.id));

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await wordsApi.search(q.trim()));
    } finally {
      setSearching(false);
    }
  };

  const add = async (wordId: string) => {
    onChange(await wordListsApi.addWords(list.id, [wordId]));
  };

  const remove = async (wordId: string) => {
    onChange(await wordListsApi.removeWord(list.id, wordId));
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-slate-100">
            📑 {list.name}{' '}
            <span className="text-xs font-normal text-gray-400">
              ({list.items.length} {t.wordCount})
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {t.close}
          </button>
        </div>

        {/* Add words */}
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder={t.searchWords}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 mb-2"
        />
        {searching && (
          <p className="text-xs text-gray-400 mb-2">{t.loading}</p>
        )}
        {results.length > 0 && (
          <ul className="space-y-1 mb-4 max-h-40 overflow-y-auto">
            {results.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-sm"
              >
                <span className="text-gray-800 dark:text-slate-200">
                  {w.word}{' '}
                  <span className="text-xs text-gray-400">{w.partOfSpeech}</span>
                </span>
                {inList.has(w.id) ? (
                  <span className="text-xs text-emerald-500">✓</span>
                ) : (
                  <button
                    onClick={() => add(w.id)}
                    className="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
                  >
                    {t.add}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Current items */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
          {list.items.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {t.empty}
            </p>
          ) : (
            <ul className="space-y-1">
              {list.items.map((i) => (
                <li
                  key={i.word.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                >
                  <span className="text-gray-800 dark:text-slate-200">
                    {i.word.word}
                  </span>
                  <button
                    onClick={() => remove(i.word.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

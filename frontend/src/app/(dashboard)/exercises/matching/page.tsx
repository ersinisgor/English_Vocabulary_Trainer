'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  matchingApi,
  MatchingPair,
  StartMatchingPayload,
} from '@/lib/api/exercises';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

const CONFIG_KEY = 'matchingConfig';

// Config handed off from the exercises page via sessionStorage.
interface MatchingConfig extends StartMatchingPayload {
  size: number; // 4 or 6 — grid columns
}

interface Card {
  cardId: string;
  pairId: string;
  text: string;
}

function buildCards(pairs: MatchingPair[]): Card[] {
  const cards: Card[] = [];
  for (const p of pairs) {
    cards.push({ cardId: `${p.pairId}:a`, pairId: p.pairId, text: p.first });
    cards.push({ cardId: `${p.pairId}:b`, pairId: p.pairId, text: p.second });
  }
  // Fisher–Yates shuffle so the two faces of a pair land in random cells.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MatchingGamePage() {
  const router = useRouter();
  const { language } = usePreferences();
  const t = useT(language).matching;

  const [config, setConfig] = useState<MatchingConfig | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [vanishing, setVanishing] = useState<Set<string>>(new Set());
  const [wrongIds, setWrongIds] = useState<string[] | null>(null);
  const [locked, setLocked] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);

  const totalPairs = cards.length / 2;
  const completed = totalPairs > 0 && matched.size === totalPairs;

  // Load config from sessionStorage on mount.
  useEffect(() => {
    const raw = sessionStorage.getItem(CONFIG_KEY);
    if (!raw) {
      setError(t.noConfig);
      setLoading(false);
      return;
    }
    try {
      setConfig(JSON.parse(raw) as MatchingConfig);
    } catch {
      setError(t.noConfig);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoard = useCallback(async (cfg: MatchingConfig) => {
    setLoading(true);
    setError('');
    setSelectedId(null);
    setMatched(new Set());
    setVanishing(new Set());
    setWrongIds(null);
    setLocked(false);
    try {
      const { pairCount, size: _size, ...filters } = cfg;
      void _size;
      const res = await matchingApi.start({ pairCount, ...filters });
      setCards(buildCards(res.pairs));
      startRef.current = Date.now();
      setElapsed(0);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  // Fetch the board once the config is available.
  useEffect(() => {
    if (config) loadBoard(config);
  }, [config, loadBoard]);

  // Stopwatch: tick every second until every pair is matched.
  useEffect(() => {
    if (loading || completed || cards.length === 0) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [loading, completed, cards.length]);

  const handleClick = (card: Card) => {
    if (locked || loading) return;
    if (matched.has(card.pairId) || vanishing.has(card.pairId)) return;

    // No card selected yet → select this one.
    if (!selectedId) {
      setSelectedId(card.cardId);
      return;
    }
    // Clicking the same card again deselects it.
    if (selectedId === card.cardId) {
      setSelectedId(null);
      return;
    }

    const first = cards.find((c) => c.cardId === selectedId);
    if (!first) {
      setSelectedId(card.cardId);
      return;
    }

    if (first.pairId === card.pairId) {
      // Correct match: play the pop-out animation, then hide both cells.
      setSelectedId(null);
      setVanishing((prev) => new Set(prev).add(card.pairId));
      setTimeout(() => {
        setMatched((prev) => new Set(prev).add(card.pairId));
        setVanishing((prev) => {
          const next = new Set(prev);
          next.delete(card.pairId);
          return next;
        });
      }, 340);
    } else {
      // Wrong match: scale both up briefly, then return them to normal.
      setLocked(true);
      setWrongIds([selectedId, card.cardId]);
      setTimeout(() => {
        setWrongIds(null);
        setSelectedId(null);
        setLocked(false);
      }, 430);
    }
  };

  const size = config?.size ?? 4;

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 dark:text-slate-500">
        {t.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-6 text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => router.push('/exercises')}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
        >
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top bar: stopwatch + remaining pairs */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t.title}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {t.pairsLeft}:{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-200">
              {totalPairs - matched.size}
            </span>
          </span>
          <span className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 font-mono text-lg font-bold tabular-nums text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            ⏱ {formatTime(elapsed)}
          </span>
          <button
            onClick={() => router.push('/exercises')}
            title={t.back}
            aria-label={t.back}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {completed ? (
        <ResultScreen
          time={formatTime(elapsed)}
          t={t}
          onRestart={() => config && loadBoard(config)}
          onBack={() => router.push('/exercises')}
        />
      ) : (
        <div
          className="grid gap-2.5 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {cards.map((card) => {
            const isMatched = matched.has(card.pairId);
            const isVanishing = vanishing.has(card.pairId);
            const isSelected = selectedId === card.cardId;
            const isWrong = wrongIds?.includes(card.cardId) ?? false;
            return (
              <button
                key={card.cardId}
                onClick={() => handleClick(card)}
                disabled={isMatched}
                aria-hidden={isMatched}
                className={`flex aspect-[4/3] items-center justify-center rounded-xl border-2 p-2 text-center text-xs font-medium leading-tight transition-colors duration-150 sm:text-sm ${
                  isMatched
                    ? 'invisible'
                    : isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-2 ring-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-600'
                } ${isVanishing ? 'animate-match-correct' : ''} ${
                  isWrong ? 'animate-match-wrong border-red-400 dark:border-red-500' : ''
                }`}
              >
                <span className="line-clamp-4 break-words">{card.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultScreen({
  time,
  t,
  onRestart,
  onBack,
}: {
  time: string;
  t: ReturnType<typeof useT>['matching'];
  onRestart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-5xl">🎉</div>
        <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
          {t.completedTitle}
        </h2>
        <p className="mb-6 text-gray-500 dark:text-slate-400">
          {t.completedSubtitle}
        </p>
        <div className="mb-8 rounded-xl bg-indigo-50 py-5 dark:bg-indigo-500/10">
          <div className="text-xs uppercase tracking-wide text-indigo-500/70 dark:text-indigo-400/70">
            {t.yourTime}
          </div>
          <div className="font-mono text-4xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {time}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t.back}
          </button>
          <button
            onClick={onRestart}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-violet-700"
          >
            {t.restart}
          </button>
        </div>
      </div>
    </div>
  );
}

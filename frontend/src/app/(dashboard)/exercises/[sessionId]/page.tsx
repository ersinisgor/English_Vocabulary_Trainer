'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { exercisesApi, Session, SessionQuestion } from '@/lib/api/exercises';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

// Human label for a content format, used by the "other side" hint badge.
function formatLabel(
  format: string,
  tx: ReturnType<typeof useT>['exercises'],
): string {
  const map: Record<string, string> = {
    ENGLISH_WORD: tx.fmtWord,
    ENGLISH_DEFINITION: tx.fmtDefinition,
    ENGLISH_SENTENCE: tx.fmtEnglishSentence,
    ENGLISH_SENTENCE_CLOZE: tx.fmtEnglishSentenceCloze,
    ENGLISH_SENTENCE_HIGHLIGHTED: tx.fmtEnglishSentenceHighlighted,
    NATIVE_MEANING: tx.fmtNativeMeaning,
    NATIVE_SENTENCE: tx.fmtNativeSentence,
    NATIVE_SENTENCE_HIGHLIGHTED: tx.fmtNativeSentenceHighlighted,
    WORD_FAMILY: tx.fmtWordFamily,
    WORD_FAMILY_MEANING: tx.fmtWordFamilyMeaning,
  };
  return map[format] ?? '';
}

// Corner badge that names the *other* face, with an info icon revealing a
// tooltip (on hover or click/tap) explaining what the badge means.
function SideBadge({
  label, info, variant,
}: {
  label: string;
  info: string;
  variant: 'front' | 'back';
}) {
  const [open, setOpen] = useState(false);
  const front = variant === 'front';
  return (
    <div className="absolute top-2 right-2 z-10">
      <div className="group relative flex items-center">
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            front
              ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
              : 'bg-indigo-500/40 text-indigo-100 border-indigo-400/40'
          }`}
        >
          ↩ {label}
          <button
            type="button"
            aria-label="info"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className={`ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
              front
                ? 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                : 'border-indigo-200/60 text-indigo-100 hover:bg-indigo-500/50'
            }`}
          >
            i
          </button>
        </span>
        <span
          className={`pointer-events-none absolute right-0 top-full mt-1 w-52 rounded-lg bg-gray-900 dark:bg-slate-700 text-white text-[10px] leading-snug text-left px-3 py-2 shadow-xl transition-opacity duration-150 ${
            open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {info}
        </span>
      </div>
    </div>
  );
}

// Renders text with **bold** markers (e.g. highlighted example sentences).
function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
    seg.startsWith('**') && seg.endsWith('**') ? (
      <strong key={i} className="font-bold text-amber-500 dark:text-amber-400">
        {seg.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{seg}</span>
    ),
  );
}

export default function ExerciseSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { language } = usePreferences();
  const t = useT(language);

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  // The most recently answered question, kept so we can show the correct
  // spelling vs. what the user typed (Writing exercise).
  const [lastAnswered, setLastAnswered] = useState<SessionQuestion | null>(null);
  // Seconds left on the current question's countdown (0 when untimed/expired).
  const [remaining, setRemaining] = useState(0);
  // Flash Card browse mode (no grading): index of the card being viewed.
  const [cardIndex, setCardIndex] = useState(0);
  // Latest "time ran out" submitter, called by the countdown when it hits 0.
  const onTimeoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    exercisesApi.getSession(sessionId).then(setSession).finally(() => setLoading(false));
  }, [sessionId]);

  // Flash Card browse mode: cards are flipped through without grading.
  const browseMode =
    session?.exerciseType === 'FLASH_CARD' && session?.trackProgress === false;

  // Per-question countdown. In graded mode it keys off the active question; in
  // browse mode it keys off the card index (so each card gets a fresh timer).
  const timeLimit = session?.timeLimitSeconds ?? 0;
  const activeQuestionId =
    session?.status === 'IN_PROGRESS'
      ? (session.questions.find((q) => !q.isAnswered)?.id ?? null)
      : null;
  const timerKey = browseMode ? `card-${cardIndex}` : activeQuestionId;

  useEffect(() => {
    if (!timerKey || timeLimit <= 0) {
      setRemaining(0);
      return;
    }
    let left = timeLimit;
    setRemaining(left);
    const id = setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        onTimeoutRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerKey, timeLimit]);

  if (loading) return <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.session.loading}</div>;
  if (!session) return <div className="text-center py-16 text-red-500">{t.session.notFound}</div>;
  if (session.status === 'COMPLETED') {
    return <ResultsScreen session={session} onRestart={() => router.push('/exercises')} t={t.session} />;
  }

  const currentQuestion = session.questions.find((q) => !q.isAnswered);
  if (!currentQuestion) return null;

  // Test sessions store a concrete type per question; fall back to the session.
  const effectiveType = currentQuestion.exerciseType ?? session.exerciseType;

  const progress = session.totalQuestions > 0 ? (session.answeredCount / session.totalQuestions) * 100 : 0;

  const handleAnswer = async (answer: string) => {
    setSubmitting(true);
    try {
      const result = await exercisesApi.submitAnswer(sessionId, currentQuestion.id, answer);
      setLastResult(result.question.isCorrect ?? null);
      setLastAnswered(result.question);
      setFlipped(false);
      setSelectedOption(null);

      if (result.session.status === 'COMPLETED') {
        const completed = await exercisesApi.getResults(sessionId);
        setSession(completed);
      } else {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            answeredCount: result.session.answeredCount,
            correctCount: result.session.correctCount,
            wrongCount: result.session.wrongCount,
            status: result.session.status,
            questions: prev.questions.map((q) => q.id === currentQuestion.id ? result.question : q),
          };
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // When the countdown expires: in browse mode just advance to the next card
  // (no grading); otherwise auto-submit a losing answer (Flash Card = "didn't
  // know", others = empty/wrong).
  onTimeoutRef.current = () => {
    if (browseMode) {
      setFlipped(false);
      setCardIndex((i) => Math.min(session.questions.length - 1, i + 1));
      return;
    }
    if (submitting) return;
    handleAnswer(effectiveType === 'FLASH_CARD' ? 'incorrect' : '');
  };

  const exit = () => router.push('/exercises');

  // Flash Card browse mode: flip through cards with prev/next, no grading.
  if (browseMode) {
    const total = session.questions.length;
    const card = session.questions[Math.min(cardIndex, total - 1)];
    const goPrev = () => {
      setFlipped(false);
      setCardIndex((i) => Math.max(0, i - 1));
    };
    const goNext = () => {
      setFlipped(false);
      setCardIndex((i) => Math.min(total - 1, i + 1));
    };
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
            {t.session.cardOf} {cardIndex + 1} / {total}
          </span>
          <ExitButton title={t.session.exit} onClick={exit} />
        </div>
        {/* Against-the-clock countdown: on expiry it just advances (no grading).
            Rendered only once the timer has started so the bar first appears
            full (instant) instead of animating from empty to full. */}
        {timeLimit > 0 && remaining > 0 && (
          <div className="mb-4">
            <div className="mb-1 flex justify-end text-xs font-semibold tabular-nums text-gray-500 dark:text-slate-400">
              ⏱ {remaining}s
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  // Snap to full instantly on (re)start; only animate while shrinking,
                  // so the bar never fills left-to-right when a card begins.
                  remaining >= timeLimit ? '' : 'transition-all duration-1000 ease-linear'
                } ${remaining <= 3 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${(remaining / timeLimit) * 100}%` }}
              />
            </div>
          </div>
        )}
        <FlashCard
          question={card}
          flipped={flipped}
          onToggle={() => setFlipped((v) => !v)}
          onAnswer={() => {}}
          submitting={false}
          showGrade={false}
          t={t.session}
          tx={t.exercises}
        />
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={cardIndex === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 py-3 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:border-indigo-300 disabled:opacity-40 transition-colors"
          >
            <span className="text-lg leading-none">←</span> {t.words?.prev ?? ''}
          </button>
          <button
            onClick={goNext}
            disabled={cardIndex === total - 1}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 py-3 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:border-indigo-300 disabled:opacity-40 transition-colors"
          >
            {t.words?.next ?? ''} <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Exit exercise */}
      <div className="mb-3 flex justify-end">
        <ExitButton title={t.session.exit} onClick={exit} />
      </div>
      {/* Per-question countdown bar — shown once started so it appears full
          instantly rather than animating from empty to full. */}
      {timeLimit > 0 && remaining > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex justify-end text-xs font-semibold tabular-nums text-gray-500 dark:text-slate-400">
            ⏱ {remaining}s
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                remaining <= 3 ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${(remaining / timeLimit) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-gray-500 dark:text-slate-400">{session.answeredCount} / {session.totalQuestions}</span>
        <div className="flex gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {session.correctCount}</span>
          <span className="text-red-500 dark:text-red-400 font-semibold">✗ {session.wrongCount}</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Result feedback */}
      {lastResult !== null && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${
          lastResult
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {lastResult ? `✓ ${t.session.correct}` : `✗ ${t.session.wrong}`}
          {/* Writing: accepted despite a single-letter typo — still show the
              correct spelling and let the user know it was off by one. */}
          {lastResult &&
            (lastAnswered?.exerciseType ?? session.exerciseType) === 'WRITING' &&
            lastAnswered &&
            // Accepted answers are the native-meaning terms (options) or, in word
            // mode, the single correct answer. A typo = correct but no exact hit.
            !(lastAnswered.options.length
              ? lastAnswered.options
              : [lastAnswered.correctAnswer]
            ).some(
              (a) =>
                a.trim().toLowerCase() ===
                (lastAnswered.userAnswer ?? '').trim().toLowerCase(),
            ) && (
              <div className="mt-2 text-sm font-normal text-emerald-700 dark:text-emerald-400">
                <div>
                  {t.session.typoNote}{' '}
                  <span className="font-semibold">{lastAnswered.correctAnswer}</span>
                </div>
                <div className="mt-0.5 text-emerald-600/80 dark:text-emerald-400/80">
                  {t.session.yourAnswer}:{' '}
                  <span className="font-semibold">{lastAnswered.userAnswer || '—'}</span>
                </div>
              </div>
            )}
          {/* Writing: on a wrong answer, show correct spelling vs. what was typed. */}
          {!lastResult &&
            (lastAnswered?.exerciseType ?? session.exerciseType) === 'WRITING' &&
            lastAnswered && (
              <div className="mt-2.5 flex gap-2 text-left">
                <div className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                  <div className="text-[11px] font-medium text-emerald-700/70 dark:text-emerald-400/70 mb-0.5">
                    {/* Native-meaning answers accept several terms (options); the
                        correctAnswer already holds the spaced "a / b / c" form. */}
                    {lastAnswered.options.length
                      ? t.session.correctAnswers
                      : t.session.correctSpelling}
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold break-words">
                    {lastAnswered.correctAnswer}
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
                  <div className="text-[11px] font-medium text-red-600/70 dark:text-red-400/70 mb-0.5">
                    {t.session.yourAnswer}
                  </div>
                  <div className="text-red-600 dark:text-red-400 font-semibold break-words">
                    {lastAnswered.userAnswer || '—'}
                  </div>
                </div>
              </div>
            )}
          {/* Multiple Choice / Find in Sentence: on a wrong pick, reveal which
              option was the correct answer. */}
          {!lastResult &&
            lastAnswered &&
            (['MULTIPLE_CHOICE', 'FIND_IN_SENTENCE'] as const).includes(
              (lastAnswered.exerciseType ??
                session.exerciseType) as 'MULTIPLE_CHOICE' | 'FIND_IN_SENTENCE',
            ) && (
              <div className="mt-2 text-sm font-normal text-emerald-700 dark:text-emerald-400">
                {t.session.correctAnswer}:{' '}
                <span className="font-semibold">{lastAnswered.correctAnswer}</span>
              </div>
            )}
        </div>
      )}

      {/* Exercise card */}
      {effectiveType === 'FLASH_CARD' && (
        <FlashCard
          question={currentQuestion}
          flipped={flipped}
          onToggle={() => setFlipped((v) => !v)}
          onAnswer={handleAnswer}
          submitting={submitting}
          t={t.session}
          tx={t.exercises}
        />
      )}
      {effectiveType === 'WRITING' && (
        <Writing
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
          submitting={submitting}
          t={t.session}
        />
      )}
      {effectiveType === 'TRUE_FALSE' && (
        <TrueFalse
          question={currentQuestion}
          onAnswer={handleAnswer}
          submitting={submitting}
          t={t.session}
        />
      )}
      {(effectiveType === 'MULTIPLE_CHOICE' ||
        effectiveType === 'FIND_IN_SENTENCE') && (
        <MultipleChoice
          question={currentQuestion}
          sentenceStyle={
            effectiveType === 'FIND_IN_SENTENCE' ||
            currentQuestion.questionText.includes('_____') ||
            currentQuestion.questionText.length > 28
          }
          selected={selectedOption}
          onSelect={setSelectedOption}
          onAnswer={handleAnswer}
          submitting={submitting}
          t={t.session}
        />
      )}
    </div>
  );
}

// Small "X" button that leaves the exercise and returns to the setup page.
function ExitButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function FlashCard({
  question, flipped, onToggle, onAnswer, submitting, t, tx, showGrade = true,
}: {
  question: SessionQuestion;
  flipped: boolean;
  onToggle: () => void;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
  tx: ReturnType<typeof useT>['exercises'];
  // When false (browse mode), the "knew / didn't know" buttons are hidden.
  showGrade?: boolean;
}) {
  const frontParts =
    question.front && question.front.length
      ? question.front
      : [{ format: '', text: question.questionText }];
  const backParts =
    question.back && question.back.length
      ? question.back
      : [{ format: '', text: question.correctAnswer }];

  // Primary format of each face — used to hint what the *other* side holds.
  const frontPrimaryLabel = formatLabel(frontParts[0].format, tx);
  const backPrimaryLabel = formatLabel(backParts[0].format, tx);
  // Part of speech is shown only on the face(s) that identify the word directly
  // — the word itself, its native meaning, or its English definition.
  const pos = question.partOfSpeech;
  const showsPos = (parts: { format: string }[]) =>
    parts.some(
      (p) =>
        p.format === 'ENGLISH_WORD' ||
        p.format === 'NATIVE_MEANING' ||
        p.format === 'ENGLISH_DEFINITION',
    );
  const frontHasWord = showsPos(frontParts);
  const backHasWord = showsPos(backParts);

  return (
    <div>
      {/* 3D Flip card — tıklamak her iki yüzde de toggle yapar */}
      <div className="flip-card w-full mb-5" style={{ height: '260px' }}>
        <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div
            className="flip-card-face relative bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 shadow-lg cursor-pointer select-none overflow-y-auto py-4"
            onClick={onToggle}
          >
            {backPrimaryLabel && (
              <SideBadge label={backPrimaryLabel} info={t.sideBadgeInfo} variant="front" />
            )}
            {pos && frontHasWord && (
              <span className="absolute top-2 left-3 text-sm font-medium text-gray-400 dark:text-slate-500 lowercase">
                {pos}
              </span>
            )}
            {frontParts.map((p, i) => {
              const cls =
                i === 0
                  ? `font-bold text-gray-900 dark:text-slate-100 text-center px-4 ${p.text.length > 28 ? 'text-lg leading-relaxed' : 'text-3xl'}${frontParts.length > 1 ? ' mb-3' : ''}`
                  : p.format === 'WORD_FAMILY'
                    ? 'text-sm text-amber-600 dark:text-amber-400 text-center px-4 mt-2'
                    : p.format === 'WORD_FAMILY_MEANING'
                      ? 'text-xs text-amber-600/70 dark:text-amber-400/70 text-center px-4 mt-0.5'
                      : 'text-sm text-gray-500 dark:text-slate-400 text-center px-4 mt-2';
              // A definition shown as a secondary hint (not the primary prompt)
              // is prefixed so its role is clear.
              const text =
                i > 0 && p.format === 'ENGLISH_DEFINITION'
                  ? `Definition: ${p.text}`
                  : p.text;
              return (
                <p key={i} className={cls}>
                  {renderRich(text)}
                </p>
              );
            })}
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">{t.flipHint}</p>
          </div>
          {/* Back */}
          <div
            className="flip-card-face flip-card-back relative bg-indigo-600 dark:bg-indigo-700 border-2 border-indigo-500 shadow-lg cursor-pointer select-none overflow-y-auto py-4"
            onClick={onToggle}
          >
            {frontPrimaryLabel && (
              <SideBadge label={frontPrimaryLabel} info={t.sideBadgeInfo} variant="back" />
            )}
            {pos && backHasWord && (
              <span className="absolute top-2 left-3 text-sm font-medium text-indigo-200/90 lowercase">
                {pos}
              </span>
            )}
            {backParts.map((p, i) => {
              const cls =
                i === 0
                  ? `text-2xl font-bold text-white text-center px-4${backParts.length > 1 ? ' mb-3' : ''}`
                  : p.format === 'WORD_FAMILY'
                    ? 'text-sm text-amber-300 text-center px-4 mt-2'
                    : p.format === 'WORD_FAMILY_MEANING'
                      ? 'text-xs text-amber-200/80 text-center px-4 mt-0.5'
                      : 'text-sm text-indigo-100 text-center px-4 mt-2';
              return (
                <p key={i} className={cls}>
                  {renderRich(p.text)}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* Self-report buttons (hidden in browse mode) */}
      {flipped && showGrade && (
        <div className="flex gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onAnswer('incorrect'); }}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            ✗ {t.didntKnow}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAnswer('correct'); }}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors"
          >
            ✓ {t.knew}
          </button>
        </div>
      )}
    </div>
  );
}

function MultipleChoice({
  question, selected, onSelect, onAnswer, submitting, t, sentenceStyle,
}: {
  question: SessionQuestion;
  selected: string | null;
  onSelect: (o: string) => void;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
  sentenceStyle?: boolean;
}) {
  return (
    <div>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center mb-5">
        {question.partOfSpeech && (
          <span className="absolute top-2.5 left-3 text-sm font-medium text-gray-400 dark:text-slate-500 lowercase">
            {question.partOfSpeech}
          </span>
        )}
        <p
          className={`text-gray-900 dark:text-slate-100 ${
            sentenceStyle ? 'text-lg font-medium leading-relaxed' : 'text-3xl font-bold'
          }`}
        >
          {renderRich(question.questionText)}
        </p>
      </div>
      <div className="space-y-2.5 mb-5">
        {question.options.map((option, i) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-5 py-3.5 rounded-xl border-2 text-sm transition-all ${
              selected === option
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900/50'
            }`}
          >
            <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold mr-3 text-center leading-6 ${
              selected === option
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
            }`}>
              {String.fromCharCode(65 + i)}
            </span>
            {renderRich(option)}
          </button>
        ))}
      </div>
      <button
        onClick={() => selected && onAnswer(selected)}
        disabled={!selected || submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-semibold transition-colors"
      >
        {t.confirm}
      </button>
    </div>
  );
}

function Writing({
  question, onAnswer, submitting, t,
}: {
  question: SessionQuestion;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
}) {
  const [value, setValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  // The complementary content (native meaning ↔ English definition) the backend
  // attached as an on-demand hint, if available for this word.
  const hint = question.back?.[0] ?? null;
  return (
    <div>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center mb-5">
        {question.partOfSpeech && (
          <span className="absolute top-2.5 left-3 text-sm font-medium text-gray-400 dark:text-slate-500 lowercase">
            {question.partOfSpeech}
          </span>
        )}
        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{question.questionText}</p>
        {hint && showHint && (
          <p className="mt-3 text-base font-medium text-amber-600 dark:text-amber-400">
            {hint.text}
          </p>
        )}
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showHint ? t.hideHint : t.showHint}
          </button>
        )}
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && !submitting && onAnswer(value.trim())}
        placeholder={t.writePlaceholder}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 mb-4 text-center text-lg"
      />
      <div className="flex gap-3">
        <button
          onClick={() => value.trim() && onAnswer(value.trim())}
          disabled={!value.trim() || submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-semibold transition-colors"
        >
          {t.submit}
        </button>
        {/* Skip without answering: counts as wrong and moves to the next question. */}
        <button
          onClick={() => !submitting && onAnswer('')}
          disabled={submitting}
          title={t.skip}
          aria-label={t.skip}
          className="flex w-14 items-center justify-center rounded-xl border-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TrueFalse({
  question, onAnswer, submitting, t,
}: {
  question: SessionQuestion;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
}) {
  return (
    <div>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center mb-5">
        {question.partOfSpeech && (
          <span className="absolute top-2.5 left-3 text-sm font-medium text-gray-400 dark:text-slate-500 lowercase">
            {question.partOfSpeech}
          </span>
        )}
        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{question.questionText}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{t.isCorrectPairing}</p>
        <p className="text-xl text-indigo-600 dark:text-indigo-400 font-semibold">{question.prompt}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer('false')}
          disabled={submitting}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
        >
          ✗ {t.falseLabel}
        </button>
        <button
          onClick={() => onAnswer('true')}
          disabled={submitting}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors"
        >
          ✓ {t.trueLabel}
        </button>
      </div>
    </div>
  );
}

function ResultsScreen({
  session, onRestart, t,
}: {
  session: Session;
  onRestart: () => void;
  t: ReturnType<typeof useT>['session'];
}) {
  const pct = session.totalQuestions > 0 ? Math.round((session.correctCount / session.totalQuestions) * 100) : 0;
  const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚';

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-lg p-10">
        <div className="text-5xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">{t.results}</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-7">
          <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
          {' '}{t.successRate}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: t.total, value: session.totalQuestions, cls: 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300' },
            { label: t.correct2, value: session.correctCount, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
            { label: t.wrong2, value: session.wrongCount, cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.cls}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-0.5 opacity-70">{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {t.restart}
        </button>
      </div>
    </div>
  );
}

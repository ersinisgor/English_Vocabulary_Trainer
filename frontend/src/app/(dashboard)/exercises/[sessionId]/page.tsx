'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { exercisesApi, Session, SessionQuestion } from '@/lib/api/exercises';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

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

  useEffect(() => {
    exercisesApi.getSession(sessionId).then(setSession).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="text-center py-16 text-gray-400 dark:text-slate-500">{t.session.loading}</div>;
  if (!session) return <div className="text-center py-16 text-red-500">{t.session.notFound}</div>;
  if (session.status === 'COMPLETED') {
    return <ResultsScreen session={session} onRestart={() => router.push('/exercises')} t={t.session} />;
  }

  const currentQuestion = session.questions.find((q) => !q.isAnswered);
  if (!currentQuestion) return null;

  const progress = session.totalQuestions > 0 ? (session.answeredCount / session.totalQuestions) * 100 : 0;

  const handleAnswer = async (answer: string) => {
    setSubmitting(true);
    try {
      const result = await exercisesApi.submitAnswer(sessionId, currentQuestion.id, answer);
      setLastResult(result.question.isCorrect ?? null);
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

  return (
    <div className="max-w-lg mx-auto">
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
        </div>
      )}

      {/* Exercise card */}
      {session.exerciseType === 'FLASH_CARD' ? (
        <FlashCard
          question={currentQuestion}
          flipped={flipped}
          onToggle={() => setFlipped((v) => !v)}
          onAnswer={handleAnswer}
          submitting={submitting}
          t={t.session}
        />
      ) : (
        <MultipleChoice
          question={currentQuestion}
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

function FlashCard({
  question, flipped, onToggle, onAnswer, submitting, t,
}: {
  question: SessionQuestion;
  flipped: boolean;
  onToggle: () => void;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
}) {
  return (
    <div>
      {/* 3D Flip card — tıklamak her iki yüzde de toggle yapar */}
      <div className="flip-card w-full mb-5" style={{ height: '220px' }}>
        <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div
            className="flip-card-face bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 shadow-lg cursor-pointer select-none"
            onClick={onToggle}
          >
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-center">{question.questionText}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">{t.flipHint}</p>
          </div>
          {/* Back */}
          <div
            className="flip-card-face flip-card-back bg-indigo-600 dark:bg-indigo-700 border-2 border-indigo-500 shadow-lg cursor-pointer select-none"
            onClick={onToggle}
          >
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-2">{question.questionText}</p>
            <p className="text-2xl font-bold text-white text-center">{question.correctAnswer}</p>
          </div>
        </div>
      </div>

      {/* Self-report buttons */}
      {flipped && (
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
  question, selected, onSelect, onAnswer, submitting, t,
}: {
  question: SessionQuestion;
  selected: string | null;
  onSelect: (o: string) => void;
  onAnswer: (a: string) => void;
  submitting: boolean;
  t: ReturnType<typeof useT>['session'];
}) {
  return (
    <div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 shadow-lg p-8 text-center mb-5">
        <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{question.questionText}</p>
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
            {option}
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

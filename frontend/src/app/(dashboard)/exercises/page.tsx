'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { exercisesApi, ExerciseType, LanguageSetting } from '@/lib/api/exercises';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

export default function ExercisesPage() {
  const router = useRouter();
  const { language } = usePreferences();
  const t = useT(language);

  const [exerciseType, setExerciseType] = useState<ExerciseType>('FLASH_CARD');
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('ENGLISH_NATIVE');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exerciseOptions: { type: ExerciseType; label: string; desc: string; icon: string }[] = [
    { type: 'FLASH_CARD', label: t.exercises.flashCard, desc: t.exercises.flashCardDesc, icon: '🃏' },
    { type: 'MULTIPLE_CHOICE', label: t.exercises.multipleChoice, desc: t.exercises.multipleChoiceDesc, icon: '✅' },
  ];

  const langOptions: { value: LanguageSetting; label: string }[] = [
    { value: 'ENGLISH_NATIVE', label: t.exercises.engNative },
    { value: 'ENGLISH_ENGLISH', label: t.exercises.engEng },
  ];

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const session = await exercisesApi.startSession({ exerciseType, languageSetting, questionCount });
      router.push(`/exercises/${session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Oturum başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">{t.exercises.title}</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
        {/* Exercise type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t.exercises.typeLabel}</label>
          <div className="space-y-2">
            {exerciseOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setExerciseType(opt.type)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  exerciseType === opt.type
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <div className={`font-semibold text-sm ${exerciseType === opt.type ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-slate-200'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t.exercises.langLabel}</label>
          <div className="flex gap-2">
            {langOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLanguageSetting(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  languageSetting === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.exercises.countLabel}: <span className="text-indigo-600 dark:text-indigo-400">{questionCount}</span>
          </label>
          <input
            type="range" min={1} max={50} value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mt-1">
            <span>1</span><span>50</span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {loading ? t.exercises.starting : t.exercises.startBtn}
        </button>
      </div>
    </div>
  );
}

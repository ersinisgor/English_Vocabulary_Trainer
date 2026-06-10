'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  exercisesApi,
  presetsApi,
  tagsApi,
  ExerciseType,
  LanguageSetting,
  WordLevel,
  PartOfSpeech,
  ContentFormat,
  ExerciseFilters,
  ExerciseFormats,
  Preset,
  Tag,
} from '@/lib/api/exercises';
import { foldersApi, Folder } from '@/lib/api/folders';
import { wordListsApi, WordList } from '@/lib/api/word-lists';
import { usePreferences } from '@/store/preferences.store';
import { useT } from '@/lib/i18n';

const LEVELS: WordLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PARTS: PartOfSpeech[] = [
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PHRASAL_VERB',
  'IDIOM',
  'EXPRESSION',
];
const OPTION_TYPES: ExerciseType[] = [
  'MULTIPLE_CHOICE',
  'MATCHING',
  'FIND_IN_SENTENCE',
];

// Types whose prompt/answer content is configurable via question/answer formats.
const CONFIGURABLE_TYPES: ExerciseType[] = ['FLASH_CARD', 'MULTIPLE_CHOICE'];

// Multiple Choice scenarios: per language, each question format maps to the
// answer (option) formats it may be paired with. The first key is the default
// question; its first answer is the default answer.
const MC_SCENARIOS: Record<
  LanguageSetting,
  Partial<Record<ContentFormat, ContentFormat[]>>
> = {
  ENGLISH_NATIVE: {
    ENGLISH_WORD: ['NATIVE_MEANING', 'NATIVE_SENTENCE_HIGHLIGHTED'],
    NATIVE_MEANING: ['ENGLISH_WORD', 'ENGLISH_SENTENCE_HIGHLIGHTED'],
    NATIVE_SENTENCE_HIGHLIGHTED: ['ENGLISH_WORD', 'ENGLISH_DEFINITION'],
    ENGLISH_SENTENCE_HIGHLIGHTED: ['NATIVE_MEANING'],
    ENGLISH_SENTENCE: ['NATIVE_SENTENCE'],
    NATIVE_SENTENCE: ['ENGLISH_SENTENCE'],
  },
  ENGLISH_ENGLISH: {
    ENGLISH_WORD: ['ENGLISH_DEFINITION', 'ENGLISH_SENTENCE_CLOZE'],
    ENGLISH_DEFINITION: ['ENGLISH_SENTENCE_HIGHLIGHTED', 'ENGLISH_WORD'],
    ENGLISH_SENTENCE_HIGHLIGHTED: ['ENGLISH_DEFINITION'],
    ENGLISH_SENTENCE_CLOZE: ['ENGLISH_WORD'],
  },
};

// Question-format options per language (insertion-ordered scenario keys).
const MC_QUESTION_BY_LANG: Record<LanguageSetting, ContentFormat[]> = {
  ENGLISH_NATIVE: Object.keys(
    MC_SCENARIOS.ENGLISH_NATIVE,
  ) as ContentFormat[],
  ENGLISH_ENGLISH: Object.keys(
    MC_SCENARIOS.ENGLISH_ENGLISH,
  ) as ContentFormat[],
};

// Allowed answer formats for a given MC question format.
function mcAnswers(
  lang: LanguageSetting,
  question: ContentFormat,
): ContentFormat[] {
  return MC_SCENARIOS[lang][question] ?? [];
}

// Front-face primary options for Flash Cards (broader than the MC set).
const FLASHCARD_FRONT_BY_LANG: Record<LanguageSetting, ContentFormat[]> = {
  ENGLISH_ENGLISH: ['ENGLISH_DEFINITION', 'ENGLISH_SENTENCE_CLOZE'],
  ENGLISH_NATIVE: [
    'ENGLISH_WORD',
    'NATIVE_MEANING',
    'ENGLISH_SENTENCE_HIGHLIGHTED',
    'ENGLISH_SENTENCE',
    'NATIVE_SENTENCE_HIGHLIGHTED',
    'NATIVE_SENTENCE',
    'ENGLISH_DEFINITION',
  ],
};

// "Random" is a UI-only front choice (ENGLISH_NATIVE): the back is decided
// per question from the scenarios, so no fixed back/add-ons are shown.
const FLASH_RANDOM = 'RANDOM' as const;
type FlashFront = ContentFormat | typeof FLASH_RANDOM;

// Flash Card front options shown in the picker; each language leads with Random.
const FLASH_FRONT_OPTIONS: Record<LanguageSetting, FlashFront[]> = {
  ENGLISH_ENGLISH: [FLASH_RANDOM, ...FLASHCARD_FRONT_BY_LANG.ENGLISH_ENGLISH],
  ENGLISH_NATIVE: [FLASH_RANDOM, ...FLASHCARD_FRONT_BY_LANG.ENGLISH_NATIVE],
};

// Back-face primary content, derived from the chosen front.
function flashBackPrimary(
  front: ContentFormat,
  lang: LanguageSetting,
): ContentFormat {
  if (lang === 'ENGLISH_NATIVE') {
    return front === 'NATIVE_MEANING' ? 'ENGLISH_WORD'
      : front === 'ENGLISH_WORD' ? 'NATIVE_MEANING'
      : 'ENGLISH_WORD';
  }
  return front === 'ENGLISH_WORD' ? 'ENGLISH_DEFINITION' : 'ENGLISH_WORD';
}

// Per-front Flash Card scenarios: fixed back primary + optional add-on formats.
// Each scenario is defined step by step; fronts without an entry stay basic
// (primary only, no optional extras).
interface FlashScenario {
  backPrimary: ContentFormat;
  frontAddons: ContentFormat[];
  backAddons: ContentFormat[];
  // Always shown on the front (not a toggle); dropped only if data is missing.
  frontFixed?: ContentFormat[];
}

const FLASH_SCENARIOS: Record<
  LanguageSetting,
  Partial<Record<ContentFormat, FlashScenario>>
> = {
  ENGLISH_NATIVE: {
    ENGLISH_WORD: {
      backPrimary: 'NATIVE_MEANING',
      frontAddons: ['ENGLISH_SENTENCE_CLOZE'],
      backAddons: ['ENGLISH_SENTENCE', 'WORD_FAMILY'],
    },
    NATIVE_MEANING: {
      backPrimary: 'ENGLISH_WORD',
      frontAddons: ['ENGLISH_SENTENCE', 'WORD_FAMILY'],
      backAddons: ['ENGLISH_SENTENCE_CLOZE'],
    },
    ENGLISH_SENTENCE_HIGHLIGHTED: {
      backPrimary: 'NATIVE_MEANING',
      frontAddons: [],
      backAddons: [],
    },
    ENGLISH_SENTENCE: {
      backPrimary: 'NATIVE_SENTENCE',
      frontAddons: [],
      backAddons: [],
    },
    NATIVE_SENTENCE_HIGHLIGHTED: {
      backPrimary: 'ENGLISH_WORD',
      frontAddons: [],
      backAddons: [],
    },
    NATIVE_SENTENCE: {
      backPrimary: 'ENGLISH_SENTENCE',
      frontAddons: [],
      backAddons: [],
    },
    ENGLISH_DEFINITION: {
      backPrimary: 'NATIVE_MEANING',
      frontAddons: [],
      backAddons: [],
    },
  },
  ENGLISH_ENGLISH: {
    ENGLISH_DEFINITION: {
      backPrimary: 'ENGLISH_WORD',
      frontAddons: [],
      backAddons: [],
    },
    ENGLISH_SENTENCE_CLOZE: {
      backPrimary: 'ENGLISH_WORD',
      frontAddons: [],
      backAddons: [],
      // The blanked word can't be guessed directly — show the definition as a hint.
      frontFixed: ['ENGLISH_DEFINITION'],
    },
  },
};

function isSentenceFormat(f: ContentFormat): boolean {
  return (
    f === 'ENGLISH_SENTENCE' ||
    f === 'ENGLISH_SENTENCE_CLOZE' ||
    f === 'ENGLISH_SENTENCE_HIGHLIGHTED' ||
    f === 'NATIVE_SENTENCE' ||
    f === 'NATIVE_SENTENCE_HIGHLIGHTED'
  );
}

function formatLabel(
  f: ContentFormat,
  t: ReturnType<typeof useT>['exercises'],
): string {
  const map: Record<ContentFormat, string> = {
    ENGLISH_WORD: t.fmtWord,
    ENGLISH_DEFINITION: t.fmtDefinition,
    ENGLISH_SENTENCE: t.fmtEnglishSentence,
    ENGLISH_SENTENCE_CLOZE: t.fmtEnglishSentenceCloze,
    ENGLISH_SENTENCE_HIGHLIGHTED: t.fmtEnglishSentenceHighlighted,
    NATIVE_MEANING: t.fmtNativeMeaning,
    NATIVE_SENTENCE: t.fmtNativeSentence,
    NATIVE_SENTENCE_HIGHLIGHTED: t.fmtNativeSentenceHighlighted,
    WORD_FAMILY: t.fmtWordFamily,
  };
  return map[f];
}

function flashFrontLabel(
  f: FlashFront,
  t: ReturnType<typeof useT>['exercises'],
): string {
  return f === FLASH_RANDOM ? t.flashRandom : formatLabel(f, t);
}

function defaultFormats(
  type: ExerciseType,
  lang: LanguageSetting,
): { q: ContentFormat; a: ContentFormat } {
  const ee = lang === 'ENGLISH_ENGLISH';
  if (type === 'FLASH_CARD') {
    return ee
      ? { q: 'ENGLISH_DEFINITION', a: 'ENGLISH_WORD' }
      : { q: 'ENGLISH_WORD', a: 'NATIVE_MEANING' };
  }
  // MULTIPLE_CHOICE: first scenario for the language.
  const q = MC_QUESTION_BY_LANG[lang][0];
  return { q, a: mcAnswers(lang, q)[0] };
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

export default function ExercisesPage() {
  const router = useRouter();
  const { language } = usePreferences();
  const t = useT(language).exercises;

  const [exerciseType, setExerciseType] = useState<ExerciseType>('FLASH_CARD');
  const [languageSetting, setLanguageSetting] =
    useState<LanguageSetting>('ENGLISH_NATIVE');
  // Flash Card only: each question draws a random language + scenario.
  const [randomLang, setRandomLang] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [numberOfOptions, setNumberOfOptions] = useState(4);

  // Multiple Choice formats
  const [questionFormat, setQuestionFormat] =
    useState<ContentFormat>('ENGLISH_WORD');
  const [answerFormat, setAnswerFormat] =
    useState<ContentFormat>('NATIVE_MEANING');
  // Flash Card faces
  const [flashFront, setFlashFront] = useState<FlashFront>('ENGLISH_WORD');
  const [frontAddonSel, setFrontAddonSel] = useState<ContentFormat[]>([]);
  const [backAddonSel, setBackAddonSel] = useState<ContentFormat[]>([]);
  const [exampleOrder, setExampleOrder] = useState(1);
  // Set when a preset is applied so the format-reset effect can be suppressed once.
  const [presetApplied, setPresetApplied] = useState(false);

  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [wordListIds, setWordListIds] = useState<string[]>([]);
  const [levels, setLevels] = useState<WordLevel[]>([]);
  const [partsOfSpeech, setPartsOfSpeech] = useState<PartOfSpeech[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [onlyKeepLearning, setOnlyKeepLearning] = useState(false);
  const [excludeLearned, setExcludeLearned] = useState(false);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [lists, setLists] = useState<WordList[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  const [presetName, setPresetName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    foldersApi.list().then(setFolders).catch(() => {});
    wordListsApi.list().then(setLists).catch(() => {});
    tagsApi.list().then(setTags).catch(() => {});
    presetsApi.list().then(setPresets).catch(() => {});
  }, []);

  // Reset question/answer formats to sensible defaults whenever the exercise
  // type or language changes — unless we just applied a preset.
  useEffect(() => {
    if (presetApplied) {
      setPresetApplied(false);
      return;
    }
    const def = defaultFormats(exerciseType, languageSetting);
    setQuestionFormat(def.q);
    setAnswerFormat(def.a);
    // Flash Card faces default to a single primary on each side.
    setFlashFront(FLASHCARD_FRONT_BY_LANG[languageSetting][0]);
    setFrontAddonSel([]);
    setBackAddonSel([]);
    // Random language is a Flash Card-only setting.
    if (exerciseType !== 'FLASH_CARD') setRandomLang(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseType, languageSetting]);

  const exerciseOptions: {
    type: ExerciseType;
    label: string;
    desc: string;
    icon: string;
  }[] = [
    { type: 'FLASH_CARD', label: t.flashCard, desc: t.flashCardDesc, icon: '🃏' },
    { type: 'MULTIPLE_CHOICE', label: t.multipleChoice, desc: t.multipleChoiceDesc, icon: '✅' },
    { type: 'WRITING', label: t.writing, desc: t.writingDesc, icon: '✍️' },
    { type: 'TRUE_FALSE', label: t.trueFalse, desc: t.trueFalseDesc, icon: '⚖️' },
    { type: 'MATCHING', label: t.matching, desc: t.matchingDesc, icon: '🔗' },
    { type: 'FIND_IN_SENTENCE', label: t.findInSentence, desc: t.findInSentenceDesc, icon: '📝' },
  ];

  const isFlashCard = exerciseType === 'FLASH_CARD';
  const isMultipleChoice = exerciseType === 'MULTIPLE_CHOICE';
  const formatsActive = CONFIGURABLE_TYPES.includes(exerciseType);

  const isRandomLanguage = isFlashCard && randomLang;
  const isRandomFlash = isFlashCard && !isRandomLanguage && flashFront === FLASH_RANDOM;
  const flashScenario: FlashScenario | undefined =
    isFlashCard && flashFront !== FLASH_RANDOM
      ? FLASH_SCENARIOS[languageSetting][flashFront]
      : undefined;
  const flashBack: ContentFormat =
    flashFront === FLASH_RANDOM
      ? // Not shown in random mode (a note replaces it); kept language-sensible.
        languageSetting === 'ENGLISH_ENGLISH'
        ? 'ENGLISH_WORD'
        : 'NATIVE_MEANING'
      : (flashScenario?.backPrimary ??
        flashBackPrimary(flashFront, languageSetting));

  const buildFlashFormats = (): {
    frontFormats: ContentFormat[];
    backFormats: ContentFormat[];
  } => {
    // Only called for a concrete (non-random) front.
    const front = flashFront as ContentFormat;
    const frontFixed = flashScenario?.frontFixed ?? [];
    const frontExtras = flashScenario
      ? frontAddonSel.filter((f) => flashScenario.frontAddons.includes(f))
      : [];
    const backExtras = flashScenario
      ? backAddonSel.filter((f) => flashScenario.backAddons.includes(f))
      : [];
    return {
      frontFormats: [front, ...frontFixed, ...frontExtras],
      backFormats: [flashBack, ...backExtras],
    };
  };

  const sentenceSelected =
    isRandomLanguage || isRandomFlash
      ? // Random may surface sentence scenarios, so allow choosing the order.
        true
      : isFlashCard
        ? (() => {
            const { frontFormats, backFormats } = buildFlashFormats();
            return [...frontFormats, ...backFormats].some(isSentenceFormat);
          })()
        : isMultipleChoice &&
          (isSentenceFormat(questionFormat) || isSentenceFormat(answerFormat));

  const collectFormats = (): ExerciseFormats => {
    if (isFlashCard) {
      if (isRandomLanguage) {
        return {
          randomLanguage: true,
          exampleOrder,
        };
      }
      if (isRandomFlash) {
        return {
          randomFlashFront: true,
          exampleOrder,
        };
      }
      const { frontFormats, backFormats } = buildFlashFormats();
      return {
        frontFormats,
        backFormats,
        exampleOrder: sentenceSelected ? exampleOrder : undefined,
      };
    }
    if (isMultipleChoice) {
      return {
        questionFormat,
        answerFormat,
        exampleOrder: sentenceSelected ? exampleOrder : undefined,
      };
    }
    return {};
  };

  const collectFilters = (): ExerciseFilters => ({
    folderIds: folderIds.length ? folderIds : undefined,
    wordListIds: wordListIds.length ? wordListIds : undefined,
    levels: levels.length ? levels : undefined,
    partsOfSpeech: partsOfSpeech.length ? partsOfSpeech : undefined,
    tagIds: tagIds.length ? tagIds : undefined,
    onlyStarred: onlyStarred || undefined,
    onlyKeepLearning: onlyKeepLearning || undefined,
    excludeLearned: excludeLearned || undefined,
  });

  const applyPreset = (p: Preset) => {
    setPresetApplied(true);
    setExerciseType(p.exerciseType);
    setLanguageSetting(p.languageSetting);
    setRandomLang(false);
    setQuestionCount(p.questionCount);
    setNumberOfOptions(p.numberOfOptions);
    const def = defaultFormats(p.exerciseType, p.languageSetting);
    setQuestionFormat(p.questionFormat ?? def.q);
    setAnswerFormat(p.answerFormat ?? def.a);
    // Derive Flash Card face state from the stored format lists
    // (first item = primary; the rest = optional add-ons).
    const fronts = p.frontFormats ?? [];
    const backs = p.backFormats ?? [];
    setFlashFront(fronts[0] ?? FLASHCARD_FRONT_BY_LANG[p.languageSetting][0]);
    setFrontAddonSel(fronts.slice(1));
    setBackAddonSel(backs.slice(1));
    setExampleOrder(p.exampleOrder ?? 1);
    setFolderIds(p.folderIds ?? []);
    setWordListIds(p.wordListIds ?? []);
    setLevels(p.levels ?? []);
    setPartsOfSpeech(p.partsOfSpeech ?? []);
    setTagIds(p.tagIds ?? []);
    setOnlyStarred(p.onlyStarred ?? false);
    setOnlyKeepLearning(p.onlyKeepLearning ?? false);
    setExcludeLearned(p.excludeLearned ?? false);
  };

  const deletePreset = async (id: string) => {
    await presetsApi.remove(id);
    setPresets(await presetsApi.list());
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    await presetsApi.create({
      name: presetName.trim(),
      exerciseType,
      languageSetting,
      questionCount,
      numberOfOptions,
      ...collectFormats(),
      ...collectFilters(),
    });
    setPresetName('');
    setShowSave(false);
    setPresets(await presetsApi.list());
  };

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const session = await exercisesApi.startSession({
        exerciseType,
        languageSetting,
        questionCount,
        numberOfOptions,
        ...collectFormats(),
        ...collectFilters(),
      });
      router.push(`/exercises/${session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Oturum başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        {t.title}
      </h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
        {/* Presets */}
        {presets.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              {t.presetLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-xs"
                >
                  <button
                    onClick={() => applyPreset(p)}
                    className="text-indigo-600 dark:text-indigo-400 font-medium"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deletePreset(p.id)}
                    className="w-4 h-4 rounded-full text-gray-400 hover:text-red-500"
                    title={t.deletePreset}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.typeLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {exerciseOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setExerciseType(opt.type)}
                className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                  exerciseType === opt.type
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <div
                      className={`font-semibold text-sm ${
                        exerciseType === opt.type
                          ? 'text-indigo-700 dark:text-indigo-400'
                          : 'text-gray-800 dark:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                      {opt.desc}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.langLabel}
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: 'ENGLISH_NATIVE', label: t.engNative },
                { value: 'ENGLISH_ENGLISH', label: t.engEng },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setLanguageSetting(opt.value);
                  setRandomLang(false);
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  !randomLang && languageSetting === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {/* Random language is Flash Card only (scenario-driven). */}
            {isFlashCard && (
              <button
                onClick={() => setRandomLang(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  randomLang
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                🎲 {t.flashRandom}
              </button>
            )}
          </div>
          {isRandomLanguage && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              {t.randomLanguageNote}
            </p>
          )}
        </div>

        {/* Multiple Choice: question format → allowed answer (option) format */}
        {isMultipleChoice && (
          <div className="space-y-4">
            <FormatPicker
              label={t.questionFormatLabel}
              t={t}
              options={MC_QUESTION_BY_LANG[languageSetting]}
              value={questionFormat}
              onChange={(f) => {
                setQuestionFormat(f);
                // Constrain the answer to the chosen question's scenarios.
                const allowed = mcAnswers(languageSetting, f);
                if (!allowed.includes(answerFormat)) {
                  setAnswerFormat(allowed[0]);
                }
              }}
            />
            <FormatPicker
              label={t.answerFormatLabel}
              t={t}
              options={mcAnswers(languageSetting, questionFormat)}
              value={answerFormat}
              onChange={setAnswerFormat}
            />
          </div>
        )}

        {/* Flash Card: front primary + optional add-ons (step-by-step) */}
        {isFlashCard && !isRandomLanguage && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                {t.frontLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FLASH_FRONT_OPTIONS[languageSetting].map((o) => (
                  <button
                    key={o}
                    onClick={() => {
                      setFlashFront(o);
                      // Available add-ons differ per front — reset selections.
                      setFrontAddonSel([]);
                      setBackAddonSel([]);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      flashFront === o
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    {o === FLASH_RANDOM ? `🎲 ${t.flashRandom}` : flashFrontLabel(o, t)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                {t.backLabel}
              </label>
              <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-sm text-gray-700 dark:text-slate-300 inline-block border border-gray-200 dark:border-slate-700">
                {isRandomFlash ? (
                  <span className="text-gray-500 dark:text-slate-400">
                    {t.flashRandomBackNote}
                  </span>
                ) : (
                  <>
                    {formatLabel(flashBack, t)}
                    <span className="text-xs text-gray-400 ml-2">
                      · {t.backFixedNote}
                    </span>
                  </>
                )}
              </div>
            </div>
            {flashScenario?.frontFixed && flashScenario.frontFixed.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  {t.frontFixedLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {flashScenario.frontFixed.map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-400"
                    >
                      {formatLabel(f, t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {flashScenario && flashScenario.frontAddons.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  {t.frontExtrasLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {flashScenario.frontAddons.map((f) => (
                    <Toggle
                      key={f}
                      label={formatLabel(f, t)}
                      value={frontAddonSel.includes(f)}
                      onChange={() =>
                        setFrontAddonSel((s) => toggle(s, f))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
            {flashScenario && flashScenario.backAddons.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  {t.backExtrasLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {flashScenario.backAddons.map((f) => (
                    <Toggle
                      key={f}
                      label={formatLabel(f, t)}
                      value={backAddonSel.includes(f)}
                      onChange={() =>
                        setBackAddonSel((s) => toggle(s, f))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Example sentence order (shown when any sentence format is active) */}
        {formatsActive && sentenceSelected && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              {t.exampleOrderLabel}
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={exampleOrder}
              onChange={(e) =>
                setExampleOrder(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Count */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            {t.countLabel}:{' '}
            <span className="text-indigo-600 dark:text-indigo-400">
              {questionCount}
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Option count */}
        {OPTION_TYPES.includes(exerciseType) && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
              {t.optionsLabel}
            </label>
            <div className="flex gap-2">
              {[4, 6, 8, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumberOfOptions(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    numberOfOptions === n
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            {t.filtersLabel}
          </p>

          {folders.length > 0 && (
            <Chips
              label={t.foldersFilter}
              options={folders.map((f) => ({ value: f.id, label: f.name }))}
              selected={folderIds}
              onToggle={(v) => setFolderIds((s) => toggle(s, v))}
            />
          )}
          {lists.length > 0 && (
            <Chips
              label={t.listsFilter}
              options={lists.map((l) => ({ value: l.id, label: l.name }))}
              selected={wordListIds}
              onToggle={(v) => setWordListIds((s) => toggle(s, v))}
            />
          )}
          <Chips
            label={t.levelsFilter}
            options={LEVELS.map((l) => ({ value: l, label: l }))}
            selected={levels}
            onToggle={(v) => setLevels((s) => toggle(s, v as WordLevel))}
          />
          <Chips
            label={t.posFilter}
            options={PARTS.map((p) => ({ value: p, label: p }))}
            selected={partsOfSpeech}
            onToggle={(v) => setPartsOfSpeech((s) => toggle(s, v as PartOfSpeech))}
          />
          {tags.length > 0 && (
            <Chips
              label={t.tagsFilter}
              options={tags.map((tg) => ({ value: tg.id, label: tg.name }))}
              selected={tagIds}
              onToggle={(v) => setTagIds((s) => toggle(s, v))}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Toggle label={t.onlyStarred} value={onlyStarred} onChange={setOnlyStarred} />
            <Toggle label={t.onlyKeepLearning} value={onlyKeepLearning} onChange={setOnlyKeepLearning} />
            <Toggle label={t.excludeLearned} value={excludeLearned} onChange={setExcludeLearned} />
          </div>
        </div>

        {/* Save preset */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
          {showSave ? (
            <div className="flex gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t.presetNamePlaceholder}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
              />
              <button
                onClick={savePreset}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                {t.save}
              </button>
              <button
                onClick={() => setShowSave(false)}
                className="px-3 py-2 rounded-lg text-gray-500 text-sm"
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium"
            >
              + {t.savePreset}
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {loading ? t.starting : t.startBtn}
        </button>
      </div>
    </div>
  );
}

function FormatPicker({
  label,
  options,
  value,
  onChange,
  t,
}: {
  label: string;
  options: ContentFormat[];
  value: ContentFormat;
  onChange: (f: ContentFormat) => void;
  t: ReturnType<typeof useT>['exercises'];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              value === o
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
            }`}
          >
            {formatLabel(o, t)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              selected.includes(o.value)
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        value
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
          : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
      }`}
    >
      {value ? '✓ ' : ''}
      {label}
    </button>
  );
}

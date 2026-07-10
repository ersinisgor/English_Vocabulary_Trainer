'use client';

import { ReactNode, useEffect, useState } from 'react';
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
  WordOrder,
  WrongAnswerSource,
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
const OPTION_TYPES: ExerciseType[] = ['MULTIPLE_CHOICE', 'FIND_IN_SENTENCE'];

// Gradable types a Test (mixed) session can draw each question from.
const TEST_TYPE_OPTIONS: ExerciseType[] = [
  'MULTIPLE_CHOICE',
  'WRITING',
  'TRUE_FALSE',
  'FIND_IN_SENTENCE',
];

// "Against the clock": each question gets this many seconds (untimed when off).
const TIME_ATTACK_SECONDS = 15;

// Matching board sizes (NxN) and the pair count each needs (N*N / 2).
const MATCHING_SIZES = [4, 6] as const;

// Types whose prompt/answer content is configurable via question/answer formats.
const CONFIGURABLE_TYPES: ExerciseType[] = ['FLASH_CARD', 'MULTIPLE_CHOICE'];

// Writing prompt options: the question shows the native meaning or the English
// definition; the user always types the English word.
const WRITING_QUESTION_FORMATS: ContentFormat[] = [
  'NATIVE_MEANING',
  'ENGLISH_DEFINITION',
];

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
    WORD_FAMILY_MEANING: t.fmtWordFamilyMeaning,
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
  if (type === 'WRITING') {
    // Prompt = native meaning (or English definition for English-English).
    return ee
      ? { q: 'ENGLISH_DEFINITION', a: 'ENGLISH_WORD' }
      : { q: 'NATIVE_MEANING', a: 'ENGLISH_WORD' };
  }
  // MULTIPLE_CHOICE: first scenario for the language.
  const q = MC_QUESTION_BY_LANG[lang][0];
  return { q, a: mcAnswers(lang, q)[0] };
}

// Flash Card add-ons start switched on: the extra sentence/word-family lines are
// what make a card worth studying, so they are opt-out rather than opt-in.
function defaultAddons(
  front: FlashFront,
  lang: LanguageSetting,
): { front: ContentFormat[]; back: ContentFormat[] } {
  const scenario =
    front === FLASH_RANDOM ? undefined : FLASH_SCENARIOS[lang][front];
  return {
    front: scenario?.frontAddons ?? [],
    back: scenario?.backAddons ?? [],
  };
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
  // Presentation order of the questions (list order vs. shuffled).
  const [wordOrder, setWordOrder] = useState<WordOrder>('RANDOM');
  // Re-ask ~1/5 of the session's words a second time.
  const [askMoreThanOnce, setAskMoreThanOnce] = useState(false);
  // "Against the clock": 15 seconds per question (off = untimed).
  const [timeAttack, setTimeAttack] = useState(false);
  // Flash Card: grade with "knew/didn't know" (on) vs. just browse with arrows (off).
  const [trackProgress, setTrackProgress] = useState(true);
  // Test (mixed) mode: which gradable types each question is drawn from.
  const [testTypes, setTestTypes] = useState<ExerciseType[]>(TEST_TYPE_OPTIONS);
  // Where the wrong answers (distractors) come from.
  const [wrongSource, setWrongSource] = useState<WrongAnswerSource>('SAME');
  const [wrongFolderIds, setWrongFolderIds] = useState<string[]>([]);
  const [wrongWordListIds, setWrongWordListIds] = useState<string[]>([]);
  const [wrongFrom, setWrongFrom] = useState('');
  const [wrongTo, setWrongTo] = useState('');
  // Matching: a self-contained grid game configured separately from sessions.
  const [matchingSize, setMatchingSize] = useState<number>(4);

  // Multiple Choice formats
  const [questionFormat, setQuestionFormat] =
    useState<ContentFormat>('ENGLISH_WORD');
  const [answerFormat, setAnswerFormat] =
    useState<ContentFormat>('NATIVE_MEANING');
  // Writing: what the user types — the English word, or a native meaning term.
  const [writingAnswer, setWritingAnswer] =
    useState<ContentFormat>('ENGLISH_WORD');
  // Flash Card faces
  const [flashFront, setFlashFront] = useState<FlashFront>('ENGLISH_WORD');
  const [frontAddonSel, setFrontAddonSel] = useState<ContentFormat[]>(
    () => defaultAddons('ENGLISH_WORD', 'ENGLISH_NATIVE').front,
  );
  const [backAddonSel, setBackAddonSel] = useState<ContentFormat[]>(
    () => defaultAddons('ENGLISH_WORD', 'ENGLISH_NATIVE').back,
  );
  const [exampleOrder, setExampleOrder] = useState(1);
  // Set when a preset is applied so the format-reset effect can be suppressed once.
  const [presetApplied, setPresetApplied] = useState(false);

  // Words hand-picked on the /words page. When set, the pool is exactly these
  // words and the filters card is replaced by a summary banner.
  const [pickedWordIds, setPickedWordIds] = useState<string[] | null>(null);

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

  // Consume the selection handed over by the /words page. Reading it once (and
  // clearing the handoff) keeps a later visit to this page on the normal
  // filter-driven flow.
  useEffect(() => {
    const raw = sessionStorage.getItem('exerciseWordIds');
    if (!raw) return;
    sessionStorage.removeItem('exerciseWordIds');
    try {
      const ids: string[] = JSON.parse(raw);
      if (!ids.length) return;
      setPickedWordIds(ids);
      // Default to asking every picked word (the slider caps at 50).
      setQuestionCount(Math.min(ids.length, 50));
    } catch {
      // Malformed handoff — fall back to the normal filter flow.
    }
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
    // Writing defaults to answering with the English word.
    setWritingAnswer('ENGLISH_WORD');
    // Flash Card faces default to the language's first front, add-ons included.
    const front = FLASHCARD_FRONT_BY_LANG[languageSetting][0];
    const addons = defaultAddons(front, languageSetting);
    setFlashFront(front);
    setFrontAddonSel(addons.front);
    setBackAddonSel(addons.back);
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
    { type: 'TEST', label: t.test, desc: t.testDesc, icon: '🎯' },
  ];

  const isFlashCard = exerciseType === 'FLASH_CARD';
  const isMultipleChoice = exerciseType === 'MULTIPLE_CHOICE';
  const isWriting = exerciseType === 'WRITING';
  const isMatching = exerciseType === 'MATCHING';
  const isTest = exerciseType === 'TEST';
  // Types that show wrong-answer options (where the distractor source applies).
  // Test mixes distractor-using types, so it shows the source too.
  const isDistractorType =
    exerciseType === 'MULTIPLE_CHOICE' ||
    exerciseType === 'TRUE_FALSE' ||
    exerciseType === 'FIND_IN_SENTENCE' ||
    exerciseType === 'TEST';
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
    if (isWriting) {
      // Native-meaning answer: prompt the English word, accept any native term.
      if (writingAnswer === 'NATIVE_MEANING') {
        return { questionFormat: 'ENGLISH_WORD', answerFormat: 'NATIVE_MEANING' };
      }
      // Word answer: the prompt format is configurable; the answer is the word.
      return { questionFormat, answerFormat: 'ENGLISH_WORD' };
    }
    return {};
  };

  // A hand-picked selection replaces the filters entirely — sending both would
  // let a filter narrow the very words the user chose.
  const collectFilters = (): ExerciseFilters => {
    if (pickedWordIds) return {};
    return {
      folderIds: folderIds.length ? folderIds : undefined,
      wordListIds: wordListIds.length ? wordListIds : undefined,
      levels: levels.length ? levels : undefined,
      partsOfSpeech: partsOfSpeech.length ? partsOfSpeech : undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      onlyStarred: onlyStarred || undefined,
      onlyKeepLearning: onlyKeepLearning || undefined,
      excludeLearned: excludeLearned || undefined,
    };
  };

  // The picked words, as a payload fragment. Presets never carry them.
  const collectPickedWords = () =>
    pickedWordIds ? { wordIds: pickedWordIds } : {};

  // Distractor-source params; only relevant for wrong-answer (option) types.
  const collectWrongAnswer = () => {
    if (!isDistractorType || wrongSource === 'SAME') {
      return { wrongAnswerSource: 'SAME' as WrongAnswerSource };
    }
    return {
      wrongAnswerSource: wrongSource,
      ...(wrongSource === 'FOLDERS' && {
        wrongAnswerFolderIds: wrongFolderIds.length ? wrongFolderIds : undefined,
        wrongAnswerWordListIds: wrongWordListIds.length
          ? wrongWordListIds
          : undefined,
      }),
      ...(wrongSource === 'DATE_RANGE' && {
        wrongAnswerFrom: wrongFrom || undefined,
        wrongAnswerTo: wrongTo || undefined,
      }),
    };
  };

  const applyPreset = (p: Preset) => {
    setPresetApplied(true);
    setExerciseType(p.exerciseType);
    setLanguageSetting(p.languageSetting);
    setRandomLang(false);
    setQuestionCount(p.questionCount);
    setNumberOfOptions(p.numberOfOptions);
    setWordOrder(p.wordOrder ?? 'RANDOM');
    setAskMoreThanOnce(p.askMoreThanOnce ?? false);
    setTimeAttack((p.timeLimitSeconds ?? 0) > 0);
    setTrackProgress(p.trackProgress ?? true);
    setTestTypes(p.testTypes?.length ? p.testTypes : TEST_TYPE_OPTIONS);
    setWrongSource(p.wrongAnswerSource ?? 'SAME');
    setWrongFolderIds(p.wrongAnswerFolderIds ?? []);
    setWrongWordListIds(p.wrongAnswerWordListIds ?? []);
    setWrongFrom(p.wrongAnswerFrom?.slice(0, 10) ?? '');
    setWrongTo(p.wrongAnswerTo?.slice(0, 10) ?? '');
    const def = defaultFormats(p.exerciseType, p.languageSetting);
    setQuestionFormat(p.questionFormat ?? def.q);
    setAnswerFormat(p.answerFormat ?? def.a);
    // Writing: a stored native-meaning answer format restores that mode.
    setWritingAnswer(
      p.exerciseType === 'WRITING' && p.answerFormat === 'NATIVE_MEANING'
        ? 'NATIVE_MEANING'
        : 'ENGLISH_WORD',
    );
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
      wordOrder,
      askMoreThanOnce,
      timeLimitSeconds: timeAttack ? TIME_ATTACK_SECONDS : undefined,
      ...(isFlashCard && { trackProgress }),
      ...(isTest && { testTypes }),
      ...collectWrongAnswer(),
      ...collectFormats(),
      ...collectFilters(),
    });
    setPresetName('');
    setShowSave(false);
    setPresets(await presetsApi.list());
  };

  const handleStart = async () => {
    setError('');

    // Matching runs as a self-contained grid game on its own page. Hand the
    // config off via sessionStorage so the board can (re)fetch and replay.
    if (isMatching) {
      const cfg = {
        pairCount: (matchingSize * matchingSize) / 2,
        size: matchingSize,
        ...collectPickedWords(),
        ...collectFilters(),
      };
      sessionStorage.setItem('matchingConfig', JSON.stringify(cfg));
      router.push('/exercises/matching');
      return;
    }

    setLoading(true);
    try {
      const session = await exercisesApi.startSession({
        exerciseType,
        languageSetting,
        questionCount,
        numberOfOptions,
        wordOrder,
        askMoreThanOnce,
        timeLimitSeconds: timeAttack ? TIME_ATTACK_SECONDS : undefined,
        ...(isFlashCard && { trackProgress }),
        ...(isTest && { testTypes }),
        ...collectWrongAnswer(),
        ...collectFormats(),
        ...collectPickedWords(),
        ...collectFilters(),
      });
      router.push(`/exercises/${session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Oturum başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  const activeFilterCount =
    folderIds.length +
    wordListIds.length +
    levels.length +
    partsOfSpeech.length +
    tagIds.length +
    (onlyStarred ? 1 : 0) +
    (onlyKeepLearning ? 1 : 0) +
    (excludeLearned ? 1 : 0);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero header */}
      <header className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          {t.title}
        </h1>
      </header>

      {/* Presets bar — a slim, horizontally scrolling strip above the columns. */}
      {presets.length > 0 && (
        <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            {t.presetLabel}
          </span>
          {presets.map((p) => (
            <div
              key={p.id}
              className="group flex shrink-0 items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 pl-3 pr-1 text-xs shadow-sm"
            >
              <button
                onClick={() => applyPreset(p)}
                className="font-medium text-indigo-600 dark:text-indigo-400"
              >
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                title={t.deletePreset}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* LEFT: exercise types + Start button (sticky on large screens) */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t.typeLabel}
            </h2>
            <div className="space-y-2">
              {exerciseOptions.map((opt) => {
                const active = exerciseType === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setExerciseType(opt.type)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      active
                        ? 'border-transparent bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-slate-600 hover:shadow-sm'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                        active ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-800'
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${
                          active ? 'text-white' : 'text-gray-800 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className={`block text-[11px] leading-tight ${
                          active ? 'text-white/80' : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50"
          >
            {loading ? t.starting : `🚀 ${t.startBtn}`}
          </button>
        </aside>

        {/* RIGHT: settings + filters */}
        <div className="space-y-5">
          {/* Settings card */}
          <div className="space-y-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            {/* Matching: board size only (replaces language/format/count) */}
            {isMatching && (
              <div>
                <SectionTitle>{t.matchingSizeLabel}</SectionTitle>
                <div className="flex gap-2">
                  {MATCHING_SIZES.map((n) => (
                    <button
                      key={n}
                      onClick={() => setMatchingSize(n)}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                        matchingSize === n
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {n === 4 ? t.matchingSize4 : t.matchingSize6}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language */}
            {!isMatching && (
            <div>
              <SectionTitle>{t.langLabel}</SectionTitle>
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
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      !randomLang && languageSetting === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {/* Random language is Flash Card only (scenario-driven). */}
                {isFlashCard && (
                  <button
                    onClick={() => setRandomLang(true)}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      randomLang
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
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
            )}

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

            {/* Writing: pick the answer type, then (for word answers) the prompt */}
            {isWriting && (
              <div className="space-y-4">
                <div>
                  <SectionTitle>{t.writingAnswerLabel}</SectionTitle>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: 'ENGLISH_WORD', label: t.fmtWord },
                        { value: 'NATIVE_MEANING', label: t.fmtNativeMeaning },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setWritingAnswer(opt.value)}
                        className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                          writingAnswer === opt.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {writingAnswer === 'ENGLISH_WORD' ? (
                  <FormatPicker
                    label={t.writingPromptLabel}
                    t={t}
                    options={WRITING_QUESTION_FORMATS}
                    value={questionFormat}
                    onChange={setQuestionFormat}
                  />
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {t.writingNativeNote}
                  </p>
                )}
              </div>
            )}

            {/* Test (mixed): which gradable types each question is drawn from */}
            {isTest && (
              <div>
                <SectionTitle>{t.testTypesLabel}</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {TEST_TYPE_OPTIONS.map((tp) => {
                    const labels: Record<string, string> = {
                      MULTIPLE_CHOICE: t.multipleChoice,
                      WRITING: t.writing,
                      TRUE_FALSE: t.trueFalse,
                      FIND_IN_SENTENCE: t.findInSentence,
                    };
                    const active = testTypes.includes(tp);
                    return (
                      <Toggle
                        key={tp}
                        label={labels[tp]}
                        value={active}
                        onChange={() =>
                          setTestTypes((s) =>
                            // Keep at least one type selected.
                            s.includes(tp)
                              ? s.length > 1
                                ? s.filter((x) => x !== tp)
                                : s
                              : [...s, tp],
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flash Card: front primary + optional add-ons (step-by-step) */}
            {isFlashCard && !isRandomLanguage && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t.frontLabel}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FLASH_FRONT_OPTIONS[languageSetting].map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setFlashFront(o);
                          // Available add-ons differ per front — reset to its defaults.
                          const addons = defaultAddons(o, languageSetting);
                          setFrontAddonSel(addons.front);
                          setBackAddonSel(addons.back);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          flashFront === o
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                            : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {o === FLASH_RANDOM ? `🎲 ${t.flashRandom}` : flashFrontLabel(o, t)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t.backLabel}
                  </label>
                  <div className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    {isRandomFlash ? (
                      <span className="text-gray-500 dark:text-slate-400">
                        {t.flashRandomBackNote}
                      </span>
                    ) : (
                      <>
                        {formatLabel(flashBack, t)}
                        <span className="ml-2 text-xs text-gray-400">
                          · {t.backFixedNote}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {flashScenario?.frontFixed && flashScenario.frontFixed.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                      {t.frontFixedLabel}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {flashScenario.frontFixed.map((f) => (
                        <span
                          key={f}
                          className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
                        >
                          {formatLabel(f, t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {flashScenario && flashScenario.frontAddons.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                      {t.frontExtrasLabel}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {flashScenario.frontAddons.map((f) => (
                        <Toggle
                          key={f}
                          label={formatLabel(f, t)}
                          value={frontAddonSel.includes(f)}
                          onChange={() => setFrontAddonSel((s) => toggle(s, f))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {flashScenario && flashScenario.backAddons.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                      {t.backExtrasLabel}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {flashScenario.backAddons.map((f) => (
                        <Toggle
                          key={f}
                          label={formatLabel(f, t)}
                          value={backAddonSel.includes(f)}
                          onChange={() => setBackAddonSel((s) => toggle(s, f))}
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
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
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
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {/* Count */}
            {!isMatching && (
            <div>
              <SectionTitle>
                {t.countLabel}
                <span className="ml-1.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {questionCount}
                </span>
              </SectionTitle>
              <input
                type="range"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            )}

            {/* Option count */}
            {(OPTION_TYPES.includes(exerciseType) || isTest) && (
              <div>
                <SectionTitle>{t.optionsLabel}</SectionTitle>
                <div className="flex gap-2">
                  {[4, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumberOfOptions(n)}
                      className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all ${
                        numberOfOptions === n
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Word order: list order vs. shuffled (not for Matching) */}
            {!isMatching && (
              <div>
                <SectionTitle>{t.wordOrderLabel}</SectionTitle>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'RANDOM', label: t.wordOrderRandom },
                      { value: 'LIST', label: t.wordOrderList },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWordOrder(opt.value)}
                      className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                        wordOrder === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ask more than once: re-ask ~1/5 of the words */}
            {!isMatching && (
              <div>
                <Toggle
                  label={t.askMoreThanOnce}
                  value={askMoreThanOnce}
                  onChange={setAskMoreThanOnce}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                  {t.askMoreThanOnceDesc}
                </p>
              </div>
            )}

            {/* Against the clock: 15 seconds per question (not for Matching) */}
            {!isMatching && (
              <div>
                <Toggle
                  label={t.timeAttack}
                  value={timeAttack}
                  onChange={setTimeAttack}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                  {t.timeAttackDesc}
                </p>
              </div>
            )}

            {/* Flash Card: grade (knew/didn't know) vs. browse with arrows */}
            {isFlashCard && (
              <div>
                <Toggle
                  label={t.trackProgress}
                  value={trackProgress}
                  onChange={setTrackProgress}
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                  {t.trackProgressDesc}
                </p>
              </div>
            )}

            {/* Where wrong answers (distractors) come from — option types only */}
            {isDistractorType && (
              <div>
                <SectionTitle>{t.wrongSrcLabel}</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: 'SAME', label: t.wrongSrcSame },
                      { value: 'ALL', label: t.wrongSrcAll },
                      { value: 'FOLDERS', label: t.wrongSrcFolders },
                      { value: 'DATE_RANGE', label: t.wrongSrcDate },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWrongSource(opt.value)}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                        wrongSource === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {wrongSource === 'FOLDERS' && (
                  <div className="mt-3 space-y-2">
                    {folders.length > 0 && (
                      <Collapsible
                        label={t.foldersFilter}
                        count={wrongFolderIds.length}
                      >
                        <Chips
                          options={folders.map((f) => ({
                            value: f.id,
                            label: f.name,
                          }))}
                          selected={wrongFolderIds}
                          onToggle={(v) =>
                            setWrongFolderIds((s) => toggle(s, v))
                          }
                        />
                      </Collapsible>
                    )}
                    {lists.length > 0 && (
                      <Collapsible
                        label={t.listsFilter}
                        count={wrongWordListIds.length}
                      >
                        <Chips
                          options={lists.map((l) => ({
                            value: l.id,
                            label: l.name,
                          }))}
                          selected={wrongWordListIds}
                          onToggle={(v) =>
                            setWrongWordListIds((s) => toggle(s, v))
                          }
                        />
                      </Collapsible>
                    )}
                  </div>
                )}

                {wrongSource === 'DATE_RANGE' && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                        {t.wrongSrcFrom}
                      </label>
                      <input
                        type="date"
                        value={wrongFrom}
                        onChange={(e) => setWrongFrom(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
                        {t.wrongSrcTo}
                      </label>
                      <input
                        type="date"
                        value={wrongTo}
                        onChange={(e) => setWrongTo(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hand-picked words: the selection stands in for the filters card. */}
          {pickedWordIds ? (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                    ✋ {t.selectionTitle(pickedWordIds.length)}
                  </p>
                  <p className="mt-1.5 text-xs text-indigo-700/80 dark:text-indigo-400/80">
                    {t.selectionNote}
                  </p>
                </div>
                <button
                  onClick={() => setPickedWordIds(null)}
                  className="shrink-0 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                >
                  {t.clearSelection}
                </button>
              </div>
            </div>
          ) : (
          /* Filters card — each filter collapses to a row; expand to choose. */
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <SectionTitle className="mb-0">{t.filtersLabel}</SectionTitle>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {folders.length > 0 && (
                <Collapsible label={t.foldersFilter} count={folderIds.length}>
                  <Chips
                    options={folders.map((f) => ({ value: f.id, label: f.name }))}
                    selected={folderIds}
                    onToggle={(v) => setFolderIds((s) => toggle(s, v))}
                  />
                </Collapsible>
              )}
              {lists.length > 0 && (
                <Collapsible label={t.listsFilter} count={wordListIds.length}>
                  <Chips
                    options={lists.map((l) => ({ value: l.id, label: l.name }))}
                    selected={wordListIds}
                    onToggle={(v) => setWordListIds((s) => toggle(s, v))}
                  />
                </Collapsible>
              )}
              <Collapsible label={t.levelsFilter} count={levels.length}>
                <Chips
                  options={LEVELS.map((l) => ({ value: l, label: l }))}
                  selected={levels}
                  onToggle={(v) => setLevels((s) => toggle(s, v as WordLevel))}
                />
              </Collapsible>
              <Collapsible label={t.posFilter} count={partsOfSpeech.length}>
                <Chips
                  options={PARTS.map((p) => ({ value: p, label: p }))}
                  selected={partsOfSpeech}
                  onToggle={(v) =>
                    setPartsOfSpeech((s) => toggle(s, v as PartOfSpeech))
                  }
                />
              </Collapsible>
              {tags.length > 0 && (
                <Collapsible label={t.tagsFilter} count={tagIds.length}>
                  <Chips
                    options={tags.map((tg) => ({ value: tg.id, label: tg.name }))}
                    selected={tagIds}
                    onToggle={(v) => setTagIds((s) => toggle(s, v))}
                  />
                </Collapsible>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Toggle label={t.onlyStarred} value={onlyStarred} onChange={setOnlyStarred} />
              <Toggle label={t.onlyKeepLearning} value={onlyKeepLearning} onChange={setOnlyKeepLearning} />
              <Toggle label={t.excludeLearned} value={excludeLearned} onChange={setExcludeLearned} />
            </div>

            {/* Save preset */}
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
              {showSave ? (
                <div className="flex gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder={t.presetNamePlaceholder}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    onClick={savePreset}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => setShowSave(false)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-500"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSave(true)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
                >
                  + {t.savePreset}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small uppercase section heading used across the settings/filters cards.
function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 ${className}`}
    >
      {children}
    </p>
  );
}

// Collapsible filter row: a header showing the name + selected count; the
// choices are revealed only when expanded, keeping the page uncluttered.
function Collapsible({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
      >
        <span className="flex items-center gap-2">
          {label}
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-semibold text-white">
              {count}
            </span>
          )}
        </span>
        <span
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-3 dark:border-slate-800">
          {children}
        </div>
      )}
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
  label?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}
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

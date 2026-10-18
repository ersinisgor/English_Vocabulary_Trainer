import { Injectable } from '@nestjs/common';
import {
  ContentFormat,
  ExampleSentence,
  ExerciseType,
  LanguageSetting,
  PartOfSpeech,
} from 'generated/prisma';
import {
  FacePart,
  GeneratedQuestion,
} from './types/generated-question.type';
import { MeaningWithRelations } from './types/meaning-with-relations.type';
import { QuestionFormats } from './types/question-formats.type';
import { shuffle } from 'src/common/utils/array.utils';

const DEFAULT_OPTION_COUNT = 4;
const CLOZE_BLANK = '_____';

// Formats that identify the word directly, so a separate pos label is shown
// next to them (Flash Card faces, MC question card, Writing prompt). The word,
// its native meaning, and its English definition each pin down one meaning.
const POS_QUESTION_FORMATS: ContentFormat[] = [
  ContentFormat.ENGLISH_WORD,
  ContentFormat.NATIVE_MEANING,
  ContentFormat.ENGLISH_DEFINITION,
];

// Full, lowercase part-of-speech labels (e.g. "phrasal verb"). Shown separately
// on Flash Cards / MC questions, and inline next to the word in MC answers.
const POS_LABELS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.NOUN]: 'noun',
  [PartOfSpeech.VERB]: 'verb',
  [PartOfSpeech.ADJECTIVE]: 'adjective',
  [PartOfSpeech.ADVERB]: 'adverb',
  [PartOfSpeech.PHRASAL_VERB]: 'phrasal verb',
  [PartOfSpeech.IDIOM]: 'idiom',
  [PartOfSpeech.EXPRESSION]: 'expression',
};

// Writing prompt → the complementary format offered as an on-demand hint:
// native meaning ↔ English definition. Other prompt formats get no hint.
const WRITING_HINT_FORMAT: Partial<Record<ContentFormat, ContentFormat>> = {
  [ContentFormat.NATIVE_MEANING]: ContentFormat.ENGLISH_DEFINITION,
  [ContentFormat.ENGLISH_DEFINITION]: ContentFormat.NATIVE_MEANING,
};

const SENTENCE_FORMATS: ContentFormat[] = [
  ContentFormat.ENGLISH_SENTENCE,
  ContentFormat.ENGLISH_SENTENCE_CLOZE,
  ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED,
  ContentFormat.NATIVE_SENTENCE,
  ContentFormat.NATIVE_SENTENCE_HIGHLIGHTED,
];

/**
 * Primary front/back scenario pairs eligible for the Flash Card "Random" front.
 * Mirrors the frontend FLASH_SCENARIOS primaries per language; for each question
 * a scenario the meaning actually supports is chosen at random.
 */
interface FlashScenario {
  // Ordered face formats; the first item is the primary (drives resolvability).
  front: ContentFormat[];
  back: ContentFormat[];
}

const FLASH_RANDOM_SCENARIOS: Record<LanguageSetting, FlashScenario[]> = {
  [LanguageSetting.ENGLISH_NATIVE]: [
    { front: [ContentFormat.ENGLISH_WORD], back: [ContentFormat.NATIVE_MEANING] },
    { front: [ContentFormat.NATIVE_MEANING], back: [ContentFormat.ENGLISH_WORD] },
    {
      front: [ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED],
      back: [ContentFormat.NATIVE_MEANING],
    },
    {
      front: [ContentFormat.ENGLISH_SENTENCE],
      back: [ContentFormat.NATIVE_SENTENCE],
    },
    {
      front: [ContentFormat.NATIVE_SENTENCE_HIGHLIGHTED],
      back: [ContentFormat.ENGLISH_WORD],
    },
    {
      front: [ContentFormat.NATIVE_SENTENCE],
      back: [ContentFormat.ENGLISH_SENTENCE],
    },
    {
      front: [ContentFormat.ENGLISH_DEFINITION],
      back: [ContentFormat.NATIVE_MEANING],
    },
  ],
  [LanguageSetting.ENGLISH_ENGLISH]: [
    {
      front: [ContentFormat.ENGLISH_DEFINITION],
      back: [ContentFormat.ENGLISH_WORD],
    },
    {
      // Cloze sentence with the English definition shown underneath as a hint.
      front: [
        ContentFormat.ENGLISH_SENTENCE_CLOZE,
        ContentFormat.ENGLISH_DEFINITION,
      ],
      back: [ContentFormat.ENGLISH_WORD],
    },
  ],
};

@Injectable()
export class QuestionGeneratorService {
  /**
   * Generates a single question for the per-meaning exercise types.
   *
   * Flash Card and Multiple Choice honor `formats` (question/answer content
   * facets + example order); the other types ignore it.
   */
  generateQuestion(
    meaning: MeaningWithRelations,
    exerciseType: ExerciseType,
    languageSetting: LanguageSetting,
    pool: MeaningWithRelations[],
    numberOfOptions = DEFAULT_OPTION_COUNT,
    formats?: QuestionFormats,
  ): GeneratedQuestion {
    switch (exerciseType) {
      case ExerciseType.FLASH_CARD:
        return this.generateFlashCard(meaning, languageSetting, formats);
      case ExerciseType.WRITING:
        return this.generateWriting(meaning, languageSetting, formats);
      case ExerciseType.TRUE_FALSE:
        return this.generateTrueFalse(meaning, languageSetting, pool);
      case ExerciseType.FIND_IN_SENTENCE:
        return this.generateFindInSentence(meaning, pool, numberOfOptions);
      case ExerciseType.MULTIPLE_CHOICE:
      default:
        return this.generateMultipleChoice(
          meaning,
          languageSetting,
          pool,
          numberOfOptions,
          formats,
        );
    }
  }

  isSentenceFormat(format: ContentFormat): boolean {
    return SENTENCE_FORMATS.includes(format);
  }

  /**
   * True when the meaning supports at least one random Flash Card scenario
   * (both faces resolvable) for the given language. Used to filter the pool
   * when the random front is selected.
   */
  hasRandomScenario(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
    exampleOrder?: number,
  ): boolean {
    return FLASH_RANDOM_SCENARIOS[languageSetting].some((s) =>
      this.scenarioResolves(meaning, s, exampleOrder),
    );
  }

  /** A scenario is usable when both primary faces (front[0]/back[0]) resolve. */
  private scenarioResolves(
    meaning: MeaningWithRelations,
    scenario: FlashScenario,
    exampleOrder: number | undefined,
  ): boolean {
    return (
      this.resolveContent(meaning, scenario.front[0], { exampleOrder }) !==
        null &&
      this.resolveContent(meaning, scenario.back[0], { exampleOrder }) !== null
    );
  }

  private generateFlashCard(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
    formats?: QuestionFormats,
  ): GeneratedQuestion {
    const exampleOrder = formats?.exampleOrder;

    // Random language: each question randomly draws from BOTH languages'
    // scenarios. Random front: random scenario within the chosen language.
    if (formats?.randomLanguage) {
      return this.generateRandomFlashCard(
        meaning,
        [LanguageSetting.ENGLISH_NATIVE, LanguageSetting.ENGLISH_ENGLISH],
        exampleOrder,
      );
    }
    if (formats?.randomFront) {
      return this.generateRandomFlashCard(meaning, [languageSetting], exampleOrder);
    }

    const resolved = this.resolveFormats(
      ExerciseType.FLASH_CARD,
      languageSetting,
      formats,
    );

    // Fall back to the single question/answer formats when explicit face lists
    // are not supplied.
    const frontFormats = resolved.frontFormats?.length
      ? resolved.frontFormats
      : [resolved.questionFormat];
    const backFormats = resolved.backFormats?.length
      ? resolved.backFormats
      : [resolved.answerFormat];

    // Cloze vs full sentence is decided by the format itself
    // (ENGLISH_SENTENCE = full, ENGLISH_SENTENCE_CLOZE = blanked).
    const front = this.buildFace(meaning, frontFormats, exampleOrder);
    const back = this.buildFace(meaning, backFormats, exampleOrder);

    return {
      questionText: front[0]?.text ?? '',
      correctAnswer: back[0]?.text ?? '',
      options: [],
      front,
      back,
      partOfSpeech: this.posLabel(meaning),
    };
  }

  /**
   * Random Flash Card: picks a language at random from `languages` (only those
   * with a usable scenario for this meaning), then a random scenario within it.
   * A single-language list yields a random front; both languages yield random
   * language + random front. Falls back to ENGLISH_NATIVE word↔meaning, which
   * resolves for every meaning.
   */
  private generateRandomFlashCard(
    meaning: MeaningWithRelations,
    languages: LanguageSetting[],
    exampleOrder: number | undefined,
  ): GeneratedQuestion {
    let scenario: FlashScenario | undefined;
    for (const language of shuffle(languages)) {
      const usable = FLASH_RANDOM_SCENARIOS[language].filter((s) =>
        this.scenarioResolves(meaning, s, exampleOrder),
      );
      if (usable.length) {
        scenario = shuffle(usable)[0];
        break;
      }
    }
    scenario ??= FLASH_RANDOM_SCENARIOS[LanguageSetting.ENGLISH_NATIVE][0];

    const front = this.buildFace(meaning, scenario.front, exampleOrder);
    const back = this.buildFace(meaning, scenario.back, exampleOrder);

    return {
      questionText: front[0]?.text ?? '',
      correctAnswer: back[0]?.text ?? '',
      options: [],
      front,
      back,
      partOfSpeech: this.posLabel(meaning),
    };
  }

  /**
   * Builds an ordered list of content parts for one Flash Card face,
   * dropping any format whose data is missing for this meaning.
   */
  private buildFace(
    meaning: MeaningWithRelations,
    formats: ContentFormat[],
    exampleOrder: number | undefined,
  ): FacePart[] {
    const parts: FacePart[] = [];

    for (const format of formats) {
      const text = this.resolveContent(meaning, format, { exampleOrder });
      if (text === null) continue;
      parts.push({ format, text });

      // The word family is unreadable without its meanings, so they ride along
      // on the next line — unless the caller already asked for them explicitly.
      if (
        format === ContentFormat.WORD_FAMILY &&
        !formats.includes(ContentFormat.WORD_FAMILY_MEANING)
      ) {
        const gloss = this.resolveContent(
          meaning,
          ContentFormat.WORD_FAMILY_MEANING,
        );
        if (gloss !== null) {
          parts.push({ format: ContentFormat.WORD_FAMILY_MEANING, text: gloss });
        }
      }
    }

    return parts;
  }

  /** Accepted native-meaning answers for a meaning: each "/"-split term. */
  nativeMeaningParts(meaning: MeaningWithRelations): string[] {
    if (meaning.splittedNativeMeanings.length > 0) {
      return meaning.splittedNativeMeanings
        .map((s) => s.meaningText.trim())
        .filter(Boolean);
    }
    return meaning.nativeMeanings
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /** Whether a meaning has at least one usable native-meaning term. */
  hasNativeMeaningParts(meaning: MeaningWithRelations): boolean {
    return this.nativeMeaningParts(meaning).length > 0;
  }

  private generateWriting(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
    formats?: QuestionFormats,
  ): GeneratedQuestion {
    const resolved = this.resolveFormats(
      ExerciseType.WRITING,
      languageSetting,
      formats,
    );

    // Native-meaning answer mode: show the English word and accept any of the
    // "/"-split native terms (the user types one, e.g. "gizli").
    if (resolved.answerFormat === ContentFormat.NATIVE_MEANING) {
      return {
        questionText: meaning.word.word,
        correctAnswer: this.spaceSlashes(meaning.nativeMeanings),
        options: this.nativeMeaningParts(meaning),
        partOfSpeech: this.posLabel(meaning),
      };
    }

    // The prompt asks the native meaning or the English definition; the user
    // types the word. Falls back to buildAnswer when the chosen format is
    // missing (pool filtering should normally prevent this).
    const { questionFormat } = resolved;
    const questionText =
      this.resolveContent(meaning, questionFormat) ??
      this.buildAnswer(meaning, languageSetting);

    // Optional hint: the "other" of native meaning / English definition, shown
    // on demand under the prompt. Omitted when its content is missing.
    const hintFormat = WRITING_HINT_FORMAT[questionFormat];
    const hintText = hintFormat
      ? this.resolveContent(meaning, hintFormat)
      : null;

    return {
      questionText,
      correctAnswer: meaning.word.word,
      options: [],
      ...(hintFormat &&
        hintText !== null && {
          back: [{ format: hintFormat, text: hintText }],
        }),
      // Pos is shown when the prompt identifies the word directly (the word, its
      // native meaning, or its English definition).
      ...(POS_QUESTION_FORMATS.includes(questionFormat) && {
        partOfSpeech: this.posLabel(meaning),
      }),
    };
  }

  private generateMultipleChoice(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
    pool: MeaningWithRelations[],
    numberOfOptions: number,
    formats?: QuestionFormats,
  ): GeneratedQuestion {
    const { questionFormat, answerFormat } = this.resolveFormats(
      ExerciseType.MULTIPLE_CHOICE,
      languageSetting,
      formats,
    );
    const exampleOrder = formats?.exampleOrder;

    const questionText =
      this.resolveContent(meaning, questionFormat, { exampleOrder }) ?? '';

    // Answers that are the English word carry their part of speech inline, e.g.
    // "wake up (phrasal verb)" — each option uses its own word's pos. Native
    // meaning options show a single representative term (not the whole list).
    const wordAnswer = answerFormat === ContentFormat.ENGLISH_WORD;
    const nativeAnswer = answerFormat === ContentFormat.NATIVE_MEANING;
    const project = (m: MeaningWithRelations): string | null =>
      wordAnswer
        ? this.wordWithPos(m)
        : nativeAnswer
          ? this.nativeMeaningPrimary(m)
          : this.resolveContent(m, answerFormat, { exampleOrder });

    const correctAnswer = project(meaning) ?? '';
    const distractors = this.buildDistractors(
      meaning,
      pool,
      project,
      correctAnswer,
      numberOfOptions - 1,
    );

    return {
      questionText,
      correctAnswer,
      options: shuffle([correctAnswer, ...distractors]),
      // Pos is shown separately on the question card when the question is the
      // English word or its native meaning (both identify the word directly).
      ...(POS_QUESTION_FORMATS.includes(questionFormat) && {
        partOfSpeech: this.posLabel(meaning),
      }),
    };
  }

  private generateTrueFalse(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
    pool: MeaningWithRelations[],
  ): GeneratedQuestion {
    const correctAnswer = this.buildAnswer(meaning, languageSetting);
    const showCorrect = Math.random() < 0.5;

    let shown = correctAnswer;
    if (!showCorrect) {
      const [distractor] = this.buildDistractors(
        meaning,
        pool,
        (m) => this.buildAnswer(m, languageSetting),
        correctAnswer,
        1,
      );
      // Fall back to a true pairing if no distractor is available.
      shown = distractor ?? correctAnswer;
    }

    return {
      questionText: meaning.word.word,
      prompt: shown,
      correctAnswer: shown === correctAnswer ? 'true' : 'false',
      options: [],
      // The question is the English word, so its pos is shown alongside.
      partOfSpeech: this.posLabel(meaning),
    };
  }

  private generateFindInSentence(
    meaning: MeaningWithRelations,
    pool: MeaningWithRelations[],
    numberOfOptions: number,
  ): GeneratedQuestion {
    const correctAnswer = meaning.word.word;
    const sentence = this.buildClozeSentence(meaning);
    const distractors = this.buildDistractors(
      meaning,
      pool,
      (m) => m.word.word,
      correctAnswer,
      numberOfOptions - 1,
    );
    return {
      questionText: sentence,
      correctAnswer,
      options: shuffle([correctAnswer, ...distractors]),
    };
  }

  // ----- Helpers -----

  private buildAnswer(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
  ): string {
    if (languageSetting === LanguageSetting.ENGLISH_ENGLISH) {
      return meaning.englishDefinition ?? this.nativeMeaningText(meaning);
    }
    return this.nativeMeaningText(meaning);
  }

  /**
   * Renders a meaning's full native side as a spaced combined list, e.g.
   * "doğrulamak / onaylamak / geçerli kılmak".
   */
  private nativeMeaningText(meaning: MeaningWithRelations): string {
    return this.spaceSlashes(meaning.nativeMeanings);
  }

  /**
   * A single representative native term for a meaning — the first "/"-split term
   * (e.g. "doğrulamak"). Used for Multiple Choice options, where showing the
   * whole list would reveal too much. Falls back to the combined list.
   */
  private nativeMeaningPrimary(meaning: MeaningWithRelations): string {
    return (
      this.nativeMeaningParts(meaning)[0] ??
      this.spaceSlashes(meaning.nativeMeanings)
    );
  }

  private buildDistractors(
    current: MeaningWithRelations,
    pool: MeaningWithRelations[],
    project: (m: MeaningWithRelations) => string | null,
    correctAnswer: string,
    count: number,
  ): string[] {
    const candidates = pool
      .filter((m) => m.id !== current.id)
      .map(project)
      .filter((value): value is string => !!value && value !== correctAnswer);

    const unique = [...new Set(candidates)];
    return shuffle(unique).slice(0, count);
  }

  // ----- Content formats -----

  /**
   * Resolves a single content facet of a meaning. Returns null when the data
   * is missing (e.g. no definition, or no example at the requested order),
   * which lets the caller filter the meaning out of the pool.
   */
  resolveContent(
    meaning: MeaningWithRelations,
    format: ContentFormat,
    opts: { exampleOrder?: number } = {},
  ): string | null {
    switch (format) {
      case ContentFormat.ENGLISH_WORD:
        return meaning.word.word;
      case ContentFormat.ENGLISH_DEFINITION:
        return meaning.englishDefinition ?? null;
      case ContentFormat.NATIVE_MEANING:
        return this.nativeMeaningText(meaning);
      case ContentFormat.ENGLISH_SENTENCE: {
        // Full example sentence (target word visible).
        const example = this.pickExample(meaning, opts.exampleOrder, 'sentence');
        if (!example) return null;
        const sentence = example.sentence ?? this.fullFromCloze(example) ?? null;
        return sentence === null ? null : this.capitalizeFirst(sentence);
      }
      case ContentFormat.ENGLISH_SENTENCE_CLOZE: {
        // Example sentence with the target word(s) blanked out.
        const example = this.pickExample(meaning, opts.exampleOrder, 'sentence');
        if (!example) return null;
        return this.capitalizeFirst(
          this.buildClozeFromExample(example, meaning.word.word),
        );
      }
      case ContentFormat.ENGLISH_SENTENCE_HIGHLIGHTED: {
        // Full sentence with the target word(s) marked for bold (**word**).
        const example = this.pickExample(meaning, opts.exampleOrder, 'sentence');
        if (!example) return null;
        return this.highlightTemplate(
          example.clozeTemplate,
          example.answers,
          example.sentence,
        );
      }
      case ContentFormat.NATIVE_SENTENCE: {
        const example = this.pickExample(
          meaning,
          opts.exampleOrder,
          'translation',
        );
        return example?.translation ?? null;
      }
      case ContentFormat.NATIVE_SENTENCE_HIGHLIGHTED: {
        const example = this.pickExample(
          meaning,
          opts.exampleOrder,
          'translation',
        );
        if (!example) return null;
        return this.highlightTemplate(
          example.translationTemplate,
          example.translationAnswers,
          example.translation,
        );
      }
      case ContentFormat.WORD_FAMILY:
        return meaning.word.wordFamily
          ? this.spaceSlashes(meaning.word.wordFamily)
          : null;
      case ContentFormat.WORD_FAMILY_MEANING:
        return meaning.word.wordFamilyMeaning
          ? this.spaceSlashes(meaning.word.wordFamilyMeaning)
          : null;
      default:
        return null;
    }
  }

  /** Normalizes "/" separators to " / " for readability (e.g. a/b → a / b). */
  private spaceSlashes(text: string): string {
    return text.replace(/\s*\/\s*/g, ' / ');
  }

  /**
   * Uppercases the sentence's first character. A cloze whose blank falls on the
   * first word starts with "_", which has no uppercase form — left untouched.
   */
  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** Lowercase part-of-speech label for a meaning, e.g. "phrasal verb". */
  posLabel(meaning: MeaningWithRelations): string {
    return POS_LABELS[meaning.word.partOfSpeech] ?? '';
  }

  /** The English word with its part of speech inline, e.g. "wake up (phrasal verb)". */
  private wordWithPos(meaning: MeaningWithRelations): string {
    const pos = this.posLabel(meaning);
    return pos ? `${meaning.word.word} (${pos})` : meaning.word.word;
  }

  private resolveFormats(
    exerciseType: ExerciseType,
    languageSetting: LanguageSetting,
    formats?: QuestionFormats,
  ): QuestionFormats {
    return formats ?? this.defaultFormats(exerciseType, languageSetting);
  }

  /** Language-aware default question/answer formats for configurable types. */
  defaultFormats(
    exerciseType: ExerciseType,
    languageSetting: LanguageSetting,
  ): QuestionFormats {
    const isEnglishEnglish =
      languageSetting === LanguageSetting.ENGLISH_ENGLISH;

    if (exerciseType === ExerciseType.FLASH_CARD) {
      const front = isEnglishEnglish
        ? ContentFormat.ENGLISH_DEFINITION
        : ContentFormat.ENGLISH_WORD;
      const back = isEnglishEnglish
        ? ContentFormat.ENGLISH_WORD
        : ContentFormat.NATIVE_MEANING;
      return {
        questionFormat: front,
        answerFormat: back,
        frontFormats: [front],
        backFormats: [back],
      };
    }

    if (exerciseType === ExerciseType.WRITING) {
      // Prompt = native meaning (or English definition for English-English);
      // the answer is always the English word.
      const prompt = isEnglishEnglish
        ? ContentFormat.ENGLISH_DEFINITION
        : ContentFormat.NATIVE_MEANING;
      return {
        questionFormat: prompt,
        answerFormat: ContentFormat.ENGLISH_WORD,
        frontFormats: [prompt],
        backFormats: [ContentFormat.ENGLISH_WORD],
      };
    }

    // MULTIPLE_CHOICE
    const mc = isEnglishEnglish
      ? {
          questionFormat: ContentFormat.ENGLISH_WORD,
          answerFormat: ContentFormat.ENGLISH_DEFINITION,
        }
      : {
          questionFormat: ContentFormat.ENGLISH_WORD,
          answerFormat: ContentFormat.NATIVE_MEANING,
        };
    return { ...mc, frontFormats: [mc.questionFormat], backFormats: [mc.answerFormat] };
  }

  /**
   * Picks the example sentence for a given 1-based order, requiring the given
   * field to be present. Falls back to the first example that has the field.
   */
  private pickExample(
    meaning: MeaningWithRelations,
    order: number | undefined,
    field: 'sentence' | 'translation',
  ): ExampleSentence | null {
    const usable = meaning.examples.filter((e) =>
      field === 'sentence' ? e.sentence || e.clozeTemplate : e.translation,
    );

    if (usable.length === 0) return null;
    if (order && order >= 1 && order <= usable.length) {
      return usable[order - 1];
    }
    return usable[0];
  }

  private buildClozeFromExample(
    example: ExampleSentence,
    word: string,
  ): string {
    // Stored cloze templates use numbered placeholders ({{1}}, {{2}}, ...);
    // render each as a blank.
    if (example.clozeTemplate) {
      return example.clozeTemplate.replace(/\{\{\d+\}\}/g, CLOZE_BLANK);
    }

    if (example.sentence) {
      const pattern = new RegExp(this.escapeRegExp(word), 'gi');
      const blanked = example.sentence.replace(pattern, CLOZE_BLANK);
      return blanked === example.sentence
        ? `${example.sentence} (${CLOZE_BLANK})`
        : blanked;
    }

    return CLOZE_BLANK;
  }

  /** Reconstructs the full sentence from a numbered cloze template + answers. */
  private fullFromCloze(example: ExampleSentence): string | null {
    if (!example.clozeTemplate) return null;
    let i = 0;
    return example.clozeTemplate.replace(
      /\{\{\d+\}\}/g,
      () => example.answers[i++] ?? CLOZE_BLANK,
    );
  }

  /**
   * Builds a "highlighted" sentence: each {{n}} placeholder in the template is
   * replaced by its answer wrapped in `**...**` markers so the client can bold
   * it. Falls back to the plain sentence when there is no template.
   */
  private highlightTemplate(
    template: string | null,
    answers: string[],
    fallback: string | null,
  ): string | null {
    if (template) {
      return template.replace(
        /\{\{(\d+)\}\}/g,
        (_match, n: string) => `**${answers[Number(n) - 1] ?? ''}**`,
      );
    }
    return fallback ?? null;
  }

  /**
   * Returns a sentence with the target word hidden. Prefers a stored cloze
   * template; otherwise blanks the word out of the example sentence.
   */
  hasUsableExample(meaning: MeaningWithRelations): boolean {
    return meaning.examples.some((e) => e.clozeTemplate || e.sentence);
  }

  private buildClozeSentence(meaning: MeaningWithRelations): string {
    const example = meaning.examples.find((e) => e.clozeTemplate || e.sentence);
    return example
      ? this.buildClozeFromExample(example, meaning.word.word)
      : CLOZE_BLANK;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

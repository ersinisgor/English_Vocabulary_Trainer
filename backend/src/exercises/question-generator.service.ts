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
// next to them (Flash Card faces, MC question card).
const POS_QUESTION_FORMATS: ContentFormat[] = [
  ContentFormat.ENGLISH_WORD,
  ContentFormat.NATIVE_MEANING,
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
   * MATCHING is built separately via {@link generateMatchingQuestions}.
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
        return this.generateWriting(meaning, languageSetting);
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

  /**
   * Builds a matching board: every question shares the same option set
   * (all native answers of the group), each with its own correct answer.
   */
  generateMatchingQuestions(
    group: MeaningWithRelations[],
    languageSetting: LanguageSetting,
  ): GeneratedQuestion[] {
    const answers = group.map((m) => this.buildAnswer(m, languageSetting));
    const options = shuffle([...new Set(answers)]);

    return group.map((meaning) => ({
      questionText: meaning.word.word,
      correctAnswer: this.buildAnswer(meaning, languageSetting),
      options,
    }));
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
      return this.generateRandomFlashCard(
        meaning,
        [languageSetting],
        exampleOrder,
      );
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
    return formats
      .map((format) => ({
        format,
        text: this.resolveContent(meaning, format, { exampleOrder }),
      }))
      .filter((part): part is FacePart => part.text !== null);
  }

  private generateWriting(
    meaning: MeaningWithRelations,
    languageSetting: LanguageSetting,
  ): GeneratedQuestion {
    return {
      questionText: this.buildAnswer(meaning, languageSetting),
      correctAnswer: meaning.word.word,
      options: [],
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
    // "wake up (phrasal verb)" — each option uses its own word's pos.
    const wordAnswer = answerFormat === ContentFormat.ENGLISH_WORD;
    const project = (m: MeaningWithRelations): string | null =>
      wordAnswer
        ? this.wordWithPos(m)
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
      return meaning.englishDefinition ?? this.spaceSlashes(meaning.nativeMeanings);
    }
    return this.spaceSlashes(meaning.nativeMeanings);
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
        return this.spaceSlashes(meaning.nativeMeanings);
      case ContentFormat.ENGLISH_SENTENCE: {
        // Full example sentence (target word visible).
        const example = this.pickExample(meaning, opts.exampleOrder, 'sentence');
        if (!example) return null;
        return example.sentence ?? this.fullFromCloze(example) ?? null;
      }
      case ContentFormat.ENGLISH_SENTENCE_CLOZE: {
        // Example sentence with the target word(s) blanked out.
        const example = this.pickExample(meaning, opts.exampleOrder, 'sentence');
        if (!example) return null;
        return this.buildClozeFromExample(example, meaning.word.word);
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
      default:
        return null;
    }
  }

  /** Normalizes "/" separators to " / " for readability (e.g. a/b → a / b). */
  private spaceSlashes(text: string): string {
    return text.replace(/\s*\/\s*/g, ' / ');
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

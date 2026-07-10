import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestionGeneratorService } from './question-generator.service';
import { StartSessionDTO } from './dtos/start-session.dto';
import { AnswerQuestionDTO } from './dtos/answer-question.dto';
import { StartMatchingDTO } from './dtos/start-matching.dto';
import { MatchingResponseDTO } from './dtos/matching-response.dto';
import {
  ContentFormat,
  ExerciseSession,
  ExerciseType,
  LanguageSetting,
  Prisma,
  SessionQuestion,
  SessionStatus,
  WordOrder,
  WrongAnswerSource,
} from 'generated/prisma';
import { shuffle } from 'src/common/utils/array.utils';
import { isWritingAcceptable } from 'src/common/utils/word.utils';
import { MeaningFilter } from './types/meaning-filter.type';
import { MeaningWithRelations } from './types/meaning-with-relations.type';
import { GeneratedQuestion } from './types/generated-question.type';
import { QuestionFormats } from './types/question-formats.type';

type SessionWithQuestions = ExerciseSession & { questions: SessionQuestion[] };

interface EffectiveSettings {
  exerciseType: ExerciseType;
  languageSetting: LanguageSetting;
  questionCount: number;
  numberOfOptions: number;
  wordOrder: WordOrder;
  askMoreThanOnce: boolean;
  // Per-question countdown in seconds; undefined/0 means untimed.
  timeLimitSeconds?: number;
  // Flash Card: when false, cards are browsed without grading.
  trackProgress: boolean;
  // Test (mixed) mode: the gradable types each question is drawn from.
  testTypes: ExerciseType[];
  wrongAnswer: WrongAnswerSettings;
  formats: QuestionFormats;
  filter: MeaningFilter;
}

interface WrongAnswerSettings {
  source: WrongAnswerSource;
  folderIds?: string[];
  wordListIds?: string[];
  from?: Date;
  to?: Date;
}

const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_OPTION_COUNT = 4;

// "Ask more than once": one in every N selected words is asked a second time.
const ASK_AGAIN_RATIO = 5;

// Gradable types a Test (mixed) session draws each question from by default.
const TEST_DEFAULT_TYPES: ExerciseType[] = [
  ExerciseType.MULTIPLE_CHOICE,
  ExerciseType.WRITING,
  ExerciseType.TRUE_FALSE,
  ExerciseType.FIND_IN_SENTENCE,
];

// Minimum pool size required per exercise type (besides MULTIPLE_CHOICE,
// which needs at least `numberOfOptions` meanings).
const MIN_POOL: Partial<Record<ExerciseType, number>> = {
  [ExerciseType.FLASH_CARD]: 1,
  [ExerciseType.WRITING]: 1,
  [ExerciseType.TRUE_FALSE]: 2,
  [ExerciseType.FIND_IN_SENTENCE]: 2,
  [ExerciseType.TEST]: 2,
};

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionGenerator: QuestionGeneratorService,
  ) {}

  async startSession(
    userId: string,
    dto: StartSessionDTO,
  ): Promise<SessionWithQuestions> {
    const settings = await this.resolveSettings(userId, dto);

    const where = await this.buildMeaningWhere(userId, settings.filter);

    let pool = await this.prisma.wordMeaning.findMany({
      where,
      include: { word: true, splittedNativeMeanings: true, examples: true },
    });

    if (settings.exerciseType === ExerciseType.FIND_IN_SENTENCE) {
      pool = pool.filter((m) => this.questionGenerator.hasUsableExample(m));
    }

    // Test (mixed): keep meanings that support at least one of the chosen types,
    // so every selected word can yield a question of some eligible type.
    if (settings.exerciseType === ExerciseType.TEST) {
      pool = pool.filter((m) =>
        settings.testTypes.some((tp) =>
          this.supportsType(m, tp, settings.languageSetting),
        ),
      );
    }

    // Random Flash Card: keep only meanings that support at least one scenario
    // in any eligible language (some languages have no universal fallback).
    if (
      settings.exerciseType === ExerciseType.FLASH_CARD &&
      (settings.formats.randomFront || settings.formats.randomLanguage)
    ) {
      const languages: LanguageSetting[] = settings.formats.randomLanguage
        ? [LanguageSetting.ENGLISH_NATIVE, LanguageSetting.ENGLISH_ENGLISH]
        : [settings.languageSetting];
      pool = pool.filter((m) =>
        languages.some((lang) =>
          this.questionGenerator.hasRandomScenario(
            m,
            lang,
            settings.formats.exampleOrder,
          ),
        ),
      );
    }

    // Keep only meanings that have content for the primary question/answer
    // formats. Optional Flash Card add-on parts may be missing — they are just
    // omitted from the card rather than excluding the whole meaning.
    const {
      questionFormat,
      answerFormat,
      frontFormats,
      backFormats,
      exampleOrder,
      randomFront,
      randomLanguage,
    } = settings.formats;
    const required: ContentFormat[] =
      settings.exerciseType === ExerciseType.FLASH_CARD
        ? // Random front/language picks a meaning-supported scenario per
          // question, so the pool is not pre-filtered by a fixed format pair.
          randomFront || randomLanguage
          ? []
          : [frontFormats[0], backFormats[0]]
        : settings.exerciseType === ExerciseType.MULTIPLE_CHOICE
          ? [questionFormat, answerFormat]
          : // Writing prompts the question format (native meaning / definition);
            // drop meanings missing that content (e.g. no English definition).
            settings.exerciseType === ExerciseType.WRITING
            ? [questionFormat]
            : [];

    if (required.length) {
      pool = pool.filter((m) =>
        required.every(
          (format) =>
            this.questionGenerator.resolveContent(m, format, {
              exampleOrder,
            }) !== null,
        ),
      );
    }

    // Writing with a native-meaning answer needs at least one "/"-split term to
    // accept (resolveContent returns '' for an empty meaning, so check parts).
    if (
      settings.exerciseType === ExerciseType.WRITING &&
      answerFormat === ContentFormat.NATIVE_MEANING
    ) {
      pool = pool.filter((m) =>
        this.questionGenerator.hasNativeMeaningParts(m),
      );
    }

    // Wrong answers (distractors) may come from a different source than the
    // questions; SAME reuses the question pool (the default / current behavior).
    const distractorPool = await this.buildDistractorPool(userId, pool, settings);

    this.validatePools(pool, distractorPool, settings);

    // Presentation order: list order (the order words were added) or shuffled.
    const ordered =
      settings.wordOrder === WordOrder.LIST
        ? this.orderByList(pool)
        : shuffle(pool);
    const selected = ordered.slice(0, settings.questionCount);
    const questionsData = this.buildQuestionsData(
      selected,
      distractorPool,
      settings,
    );

    return this.prisma.exerciseSession.create({
      data: {
        userId,
        exerciseType: settings.exerciseType,
        languageSetting: settings.languageSetting,
        timeLimitSeconds: settings.timeLimitSeconds ?? null,
        trackProgress: settings.trackProgress,
        totalQuestions: questionsData.length,
        questions: { create: questionsData },
      },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });
  }

  /**
   * Builds a self-contained matching board (no persisted session). Returns the
   * requested number of unique pairs, each coupling an English word with the
   * first split of its native meaning. Using SplittedNativeMeaning keeps the
   * native side a single clean term, never a "bırakmak / teslim olmak / pes
   * etmek" slash list.
   */
  async startMatching(
    userId: string,
    dto: StartMatchingDTO,
  ): Promise<MatchingResponseDTO> {
    const filter: MeaningFilter = {
      wordIds: dto.wordIds,
      folderIds: dto.folderIds,
      wordListIds: dto.wordListIds,
      levels: dto.levels,
      partsOfSpeech: dto.partsOfSpeech,
      onlyStarred: dto.onlyStarred,
      onlyKeepLearning: dto.onlyKeepLearning,
      excludeLearned: dto.excludeLearned,
      tagIds: dto.tagIds,
    };

    const where = await this.buildMeaningWhere(userId, filter);
    const pool = await this.prisma.wordMeaning.findMany({
      where,
      include: {
        word: true,
        splittedNativeMeanings: { orderBy: { order: 'asc' } },
      },
    });

    const pairs: MatchingResponseDTO['pairs'] = [];
    // Both sides must be unique across the board, otherwise a card could match
    // two different partners and the game becomes ambiguous.
    const seenFirst = new Set<string>();
    const seenSecond = new Set<string>();

    for (const meaning of shuffle(pool)) {
      // First split of the native meaning (lowest order); skip if absent.
      const split = meaning.splittedNativeMeanings[0];
      if (!split?.meaningText) continue;
      const first = meaning.word.word;
      const second = split.meaningText;

      const firstKey = first.toLowerCase().trim();
      const secondKey = second.toLowerCase().trim();
      if (
        !firstKey ||
        !secondKey ||
        seenFirst.has(firstKey) ||
        seenSecond.has(secondKey)
      ) {
        continue;
      }

      seenFirst.add(firstKey);
      seenSecond.add(secondKey);
      pairs.push({ pairId: meaning.id, first, second });
      if (pairs.length === dto.pairCount) break;
    }

    if (pairs.length < dto.pairCount) {
      throw new BadRequestException(
        `Not enough vocabulary for this matching board. You need at least ${dto.pairCount} words with a native meaning.`,
      );
    }

    return { pairs };
  }

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionWithQuestions> {
    return this.findSessionOrThrow(userId, sessionId);
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: AnswerQuestionDTO,
  ): Promise<{
    question: SessionQuestion;
    session: Pick<
      SessionWithQuestions,
      'answeredCount' | 'correctCount' | 'wrongCount' | 'status'
    >;
  }> {
    const session = await this.findSessionOrThrow(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Session is already completed or abandoned',
      );
    }

    const question = session.questions.find((q) => q.id === dto.questionId);
    if (!question) {
      throw new NotFoundException('Question not found in this session');
    }

    if (question.isAnswered) {
      throw new BadRequestException('Question has already been answered');
    }

    const isCorrect = this.evaluateAnswer(
      // Test sessions store the concrete type per question; fall back to the
      // session type for single-type sessions.
      question.exerciseType ?? session.exerciseType,
      question.correctAnswer,
      dto.answer,
      // Writing with a native-meaning answer stores the accepted terms here.
      question.options,
    );
    const now = new Date();

    const newAnsweredCount = session.answeredCount + 1;
    const newCorrectCount = session.correctCount + (isCorrect ? 1 : 0);
    const newWrongCount = session.wrongCount + (isCorrect ? 0 : 1);
    const isCompleted = newAnsweredCount === session.totalQuestions;

    const [updatedQuestion, , updatedSession] = await this.prisma.$transaction([
      this.prisma.sessionQuestion.update({
        where: { id: dto.questionId },
        data: {
          isAnswered: true,
          isCorrect,
          userAnswer: dto.answer,
          answeredAt: now,
        },
      }),
      this.buildUserMeaningStateUpsert(
        userId,
        question.meaningId,
        isCorrect,
        now,
      ),
      this.prisma.exerciseSession.update({
        where: { id: sessionId },
        data: {
          answeredCount: newAnsweredCount,
          correctCount: newCorrectCount,
          wrongCount: newWrongCount,
          ...(isCompleted && {
            status: SessionStatus.COMPLETED,
            completedAt: now,
          }),
        },
      }),
    ]);

    return {
      question: updatedQuestion,
      session: {
        answeredCount: updatedSession.answeredCount,
        correctCount: updatedSession.correctCount,
        wrongCount: updatedSession.wrongCount,
        status: updatedSession.status,
      },
    };
  }

  async getResults(
    userId: string,
    sessionId: string,
  ): Promise<SessionWithQuestions> {
    const session = await this.findSessionOrThrow(userId, sessionId);

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is not completed yet');
    }

    return session;
  }

  // ----- Settings & filters -----

  private async resolveSettings(
    userId: string,
    dto: StartSessionDTO,
  ): Promise<EffectiveSettings> {
    const preset = dto.presetId
      ? await this.loadPreset(userId, dto.presetId)
      : null;

    const pick = <T>(
      dtoValue: T | undefined,
      presetValue: T | undefined | null,
    ): T | undefined =>
      dtoValue !== undefined ? dtoValue : (presetValue ?? undefined);

    const defaults = this.questionGenerator.defaultFormats(
      dto.exerciseType,
      dto.languageSetting,
    );

    return {
      exerciseType: dto.exerciseType,
      languageSetting: dto.languageSetting,
      questionCount:
        pick(dto.questionCount, preset?.questionCount) ??
        DEFAULT_QUESTION_COUNT,
      numberOfOptions:
        pick(dto.numberOfOptions, preset?.numberOfOptions) ??
        DEFAULT_OPTION_COUNT,
      wordOrder:
        pick(dto.wordOrder, preset?.wordOrder) ?? WordOrder.RANDOM,
      askMoreThanOnce:
        pick(dto.askMoreThanOnce, preset?.askMoreThanOnce) ?? false,
      timeLimitSeconds:
        pick(dto.timeLimitSeconds, preset?.timeLimitSeconds) ?? undefined,
      trackProgress: pick(dto.trackProgress, preset?.trackProgress) ?? true,
      // Empty/absent test types fall back to all gradable types.
      testTypes: (() => {
        const picked = pick(dto.testTypes, preset?.testTypes);
        return picked && picked.length ? picked : TEST_DEFAULT_TYPES;
      })(),
      wrongAnswer: {
        source:
          pick(dto.wrongAnswerSource, preset?.wrongAnswerSource) ??
          WrongAnswerSource.SAME,
        folderIds: pick(dto.wrongAnswerFolderIds, preset?.wrongAnswerFolderIds),
        wordListIds: pick(
          dto.wrongAnswerWordListIds,
          preset?.wrongAnswerWordListIds,
        ),
        from: dto.wrongAnswerFrom
          ? new Date(dto.wrongAnswerFrom)
          : (preset?.wrongAnswerFrom ?? undefined),
        to: dto.wrongAnswerTo
          ? new Date(dto.wrongAnswerTo)
          : (preset?.wrongAnswerTo ?? undefined),
      },
      formats: {
        questionFormat:
          pick(dto.questionFormat, preset?.questionFormat) ??
          defaults.questionFormat,
        answerFormat:
          pick(dto.answerFormat, preset?.answerFormat) ?? defaults.answerFormat,
        frontFormats: this.pickList(
          dto.frontFormats,
          preset?.frontFormats,
          defaults.frontFormats,
        ),
        backFormats: this.pickList(
          dto.backFormats,
          preset?.backFormats,
          defaults.backFormats,
        ),
        exampleOrder: pick(dto.exampleOrder, preset?.exampleOrder),
        randomFront: dto.randomFlashFront ?? undefined,
        randomLanguage: dto.randomLanguage ?? undefined,
      },
      filter: {
        // Hand-picked words come from the request only; presets never store them.
        wordIds: dto.wordIds,
        folderIds: pick(dto.folderIds, preset?.folderIds),
        wordListIds: pick(dto.wordListIds, preset?.wordListIds),
        levels: pick(dto.levels, preset?.levels),
        partsOfSpeech: pick(dto.partsOfSpeech, preset?.partsOfSpeech),
        onlyStarred: pick(dto.onlyStarred, preset?.onlyStarred),
        onlyKeepLearning: pick(dto.onlyKeepLearning, preset?.onlyKeepLearning),
        excludeLearned: pick(dto.excludeLearned, preset?.excludeLearned),
        tagIds: pick(dto.tagIds, preset?.tagIds),
      },
    };
  }

  private pickList(
    dtoValue: ContentFormat[] | undefined,
    presetValue: ContentFormat[] | undefined,
    fallback: ContentFormat[],
  ): ContentFormat[] {
    if (dtoValue && dtoValue.length) return dtoValue;
    if (presetValue && presetValue.length) return presetValue;
    return fallback;
  }

  private async loadPreset(userId: string, presetId: string) {
    const preset = await this.prisma.exerciseSettingsPreset.findFirst({
      where: { id: presetId, userId },
    });

    if (!preset) {
      throw new NotFoundException('Exercise settings preset not found');
    }

    return preset;
  }

  private async buildMeaningWhere(
    userId: string,
    filter: MeaningFilter,
  ): Promise<Prisma.WordMeaningWhereInput> {
    const listIds = await this.resolveListIds(
      userId,
      filter.folderIds,
      filter.wordListIds,
    );

    const wordWhere: Prisma.WordWhereInput = { userId };
    if (filter.wordIds?.length) {
      wordWhere.id = { in: filter.wordIds };
    }
    if (filter.levels?.length) {
      wordWhere.level = { in: filter.levels };
    }
    if (filter.partsOfSpeech?.length) {
      wordWhere.partOfSpeech = { in: filter.partsOfSpeech };
    }
    if (listIds.length) {
      wordWhere.listItems = { some: { wordListId: { in: listIds } } };
    }

    const where: Prisma.WordMeaningWhereInput = { word: wordWhere };

    const stateConditions: Prisma.UserMeaningStateWhereInput = { userId };
    if (filter.onlyStarred) {
      stateConditions.isStarred = true;
    }
    if (filter.onlyKeepLearning) {
      stateConditions.keepLearning = true;
    }
    if (Object.keys(stateConditions).length > 1) {
      where.userStates = { some: stateConditions };
    }

    if (filter.excludeLearned) {
      // A meaning is "learned" once its state has keepLearning=false.
      // Meanings without any state are still in rotation.
      where.userStates = {
        ...(where.userStates ?? {}),
        none: { userId, keepLearning: false },
      };
    }

    if (filter.tagIds?.length) {
      where.tags = { some: { tagId: { in: filter.tagIds } } };
    }

    return where;
  }

  /** Resolves folder ids to their word-list ids and merges with explicit list ids. */
  private async resolveListIds(
    userId: string,
    folderIds?: string[],
    wordListIds?: string[],
  ): Promise<string[]> {
    const ids = new Set(wordListIds ?? []);

    if (folderIds?.length) {
      const lists = await this.prisma.wordList.findMany({
        where: { userId, folderId: { in: folderIds } },
        select: { id: true },
      });
      lists.forEach((l) => ids.add(l.id));
    }

    return [...ids];
  }

  // Exercise types that draw wrong answers (distractors) from a pool.
  private static readonly DISTRACTOR_TYPES: ExerciseType[] = [
    ExerciseType.MULTIPLE_CHOICE,
    ExerciseType.TRUE_FALSE,
    ExerciseType.FIND_IN_SENTENCE,
    // Test mixes distractor-using types, so it draws from the distractor pool too.
    ExerciseType.TEST,
  ];

  private validatePools(
    questionPool: MeaningWithRelations[],
    distractorPool: MeaningWithRelations[],
    settings: EffectiveSettings,
  ): void {
    if (questionPool.length === 0) {
      throw new BadRequestException(
        'No vocabulary matches the selected filters. Add words or relax the filters.',
      );
    }

    // Multiple Choice (and a Test that includes it) needs at least
    // `numberOfOptions` meanings to fill the option list.
    const needsOptionCount =
      settings.exerciseType === ExerciseType.MULTIPLE_CHOICE ||
      (settings.exerciseType === ExerciseType.TEST &&
        settings.testTypes.includes(ExerciseType.MULTIPLE_CHOICE));
    const required = needsOptionCount
      ? settings.numberOfOptions
      : (MIN_POOL[settings.exerciseType] ?? 1);

    // For distractor-using types the requirement falls on the distractor pool
    // (which equals the question pool when the source is SAME).
    const usesDistractors = ExercisesService.DISTRACTOR_TYPES.includes(
      settings.exerciseType,
    );
    const poolToCheck = usesDistractors ? distractorPool : questionPool;

    if (poolToCheck.length < required) {
      const fromSeparateSource =
        usesDistractors && settings.wrongAnswer.source !== WrongAnswerSource.SAME;
      throw new BadRequestException(
        fromSeparateSource
          ? `Not enough words in the wrong-answers source. You need at least ${required}.`
          : `Not enough vocabulary for this exercise. You need at least ${required} matching words.`,
      );
    }
  }

  /**
   * Builds the pool the distractors are drawn from. SAME reuses the question
   * pool; the others query a separate set (all words, chosen folders/lists, or
   * a creation-date range).
   */
  private async buildDistractorPool(
    userId: string,
    questionPool: MeaningWithRelations[],
    settings: EffectiveSettings,
  ): Promise<MeaningWithRelations[]> {
    const wa = settings.wrongAnswer;
    if (wa.source === WrongAnswerSource.SAME) {
      return questionPool;
    }

    const wordWhere: Prisma.WordWhereInput = { userId };

    if (wa.source === WrongAnswerSource.FOLDERS) {
      const listIds = await this.resolveListIds(
        userId,
        wa.folderIds,
        wa.wordListIds,
      );
      if (listIds.length) {
        wordWhere.listItems = { some: { wordListId: { in: listIds } } };
      }
    } else if (wa.source === WrongAnswerSource.DATE_RANGE) {
      if (wa.from || wa.to) {
        wordWhere.createdAt = {
          ...(wa.from && { gte: wa.from }),
          ...(wa.to && { lte: wa.to }),
        };
      }
    }

    return this.prisma.wordMeaning.findMany({
      where: { word: wordWhere },
      include: { word: true, splittedNativeMeanings: true, examples: true },
    });
  }

  /**
   * Orders meanings the way they were added: by the word's creation time, then
   * by meaning order within a word. Returns a new array (does not mutate input).
   */
  private orderByList(
    pool: MeaningWithRelations[],
  ): MeaningWithRelations[] {
    return [...pool].sort((a, b) => {
      const byCreated =
        a.word.createdAt.getTime() - b.word.createdAt.getTime();
      return byCreated !== 0 ? byCreated : a.meaningOrder - b.meaningOrder;
    });
  }

  private buildQuestionsData(
    selected: MeaningWithRelations[],
    pool: MeaningWithRelations[],
    settings: EffectiveSettings,
  ): Prisma.SessionQuestionCreateManySessionInput[] {
    const isTest = settings.exerciseType === ExerciseType.TEST;

    const makeEntry = (meaning: MeaningWithRelations) => {
      // Test mode: each question is one of the meaning-supported chosen types,
      // generated with that type's default formats. Otherwise use the single
      // session type and its configured formats.
      const type = isTest
        ? this.pickSupportedType(meaning, settings)
        : settings.exerciseType;
      const formats = isTest
        ? this.questionGenerator.defaultFormats(type, settings.languageSetting)
        : settings.formats;
      return {
        meaningId: meaning.id,
        type: isTest ? type : null,
        q: this.questionGenerator.generateQuestion(
          meaning,
          type,
          settings.languageSetting,
          pool,
          settings.numberOfOptions,
          formats,
        ),
      };
    };

    const generated: Array<{
      meaningId: string;
      type: ExerciseType | null;
      q: GeneratedQuestion;
    }> = selected.map(makeEntry);

    // "Ask more than once": re-ask floor(N/5) random words a second time,
    // inserting each freshly-generated question at a random position so the
    // repeats are scattered rather than clustered.
    if (settings.askMoreThanOnce) {
      const extraCount = Math.floor(selected.length / ASK_AGAIN_RATIO);
      for (const meaning of shuffle(selected).slice(0, extraCount)) {
        const at = Math.floor(Math.random() * (generated.length + 1));
        generated.splice(at, 0, makeEntry(meaning));
      }
    }

    return generated.map(({ meaningId, type, q }, index) => ({
      meaningId,
      questionOrder: index,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: q.options,
      prompt: q.prompt ?? null,
      partOfSpeech: q.partOfSpeech ?? null,
      ...(type && { exerciseType: type }),
      ...(q.front && { front: q.front as unknown as Prisma.InputJsonValue }),
      ...(q.back && { back: q.back as unknown as Prisma.InputJsonValue }),
    }));
  }

  /**
   * Whether a meaning can yield a question of the given gradable type, using
   * that type's default formats. Drives Test (mixed) pool filtering and the
   * per-question type pick.
   */
  private supportsType(
    meaning: MeaningWithRelations,
    type: ExerciseType,
    languageSetting: LanguageSetting,
  ): boolean {
    if (type === ExerciseType.FIND_IN_SENTENCE) {
      return this.questionGenerator.hasUsableExample(meaning);
    }
    const formats = this.questionGenerator.defaultFormats(type, languageSetting);
    if (type === ExerciseType.TRUE_FALSE) {
      // True/False shows the answer face (default answer format) and asks if it
      // matches — the meaning just needs that content resolvable.
      return (
        this.questionGenerator.resolveContent(
          meaning,
          formats.answerFormat,
          {},
        ) !== null
      );
    }
    // Multiple Choice / Writing need both prompt and answer content.
    return (
      this.questionGenerator.resolveContent(meaning, formats.questionFormat, {}) !==
        null &&
      this.questionGenerator.resolveContent(meaning, formats.answerFormat, {}) !==
        null
    );
  }

  /** Random Test type the meaning supports (falls back to the first chosen). */
  private pickSupportedType(
    meaning: MeaningWithRelations,
    settings: EffectiveSettings,
  ): ExerciseType {
    const supported = settings.testTypes.filter((tp) =>
      this.supportsType(meaning, tp, settings.languageSetting),
    );
    const pool = supported.length ? supported : settings.testTypes;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ----- Internals -----

  private async findSessionOrThrow(
    userId: string,
    sessionId: string,
  ): Promise<SessionWithQuestions> {
    const session = await this.prisma.exerciseSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private evaluateAnswer(
    exerciseType: ExerciseType,
    correctAnswer: string,
    userAnswer: string,
    acceptedAnswers: string[] = [],
  ): boolean {
    switch (exerciseType) {
      case ExerciseType.FLASH_CARD:
        return userAnswer === 'correct';
      case ExerciseType.WRITING:
        // Native-meaning answer mode: accept any of the "/"-split terms (each
        // with single-typo tolerance). Otherwise compare against the word.
        return acceptedAnswers.length > 0
          ? acceptedAnswers.some((a) => isWritingAcceptable(a, userAnswer))
          : isWritingAcceptable(correctAnswer, userAnswer);
      case ExerciseType.TRUE_FALSE:
        return userAnswer.trim().toLowerCase() === correctAnswer;
      default:
        return userAnswer.trim() === correctAnswer.trim();
    }
  }

  private buildUserMeaningStateUpsert(
    userId: string,
    meaningId: string,
    isCorrect: boolean,
    now: Date,
  ) {
    return this.prisma.userMeaningState.upsert({
      where: { userId_meaningId: { userId, meaningId } },
      create: {
        userId,
        meaningId,
        practiceCount: 1,
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        streakCount: isCorrect ? 1 : 0,
        firstReviewAt: now,
        lastReviewedAt: now,
      },
      update: {
        practiceCount: { increment: 1 },
        ...(isCorrect
          ? { correctCount: { increment: 1 }, streakCount: { increment: 1 } }
          : { wrongCount: { increment: 1 }, streakCount: 0 }),
        lastReviewedAt: now,
      },
    });
  }
}

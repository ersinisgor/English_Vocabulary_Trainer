import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestionGeneratorService } from './question-generator.service';
import { StartSessionDTO } from './dtos/start-session.dto';
import { AnswerQuestionDTO } from './dtos/answer-question.dto';
import {
  ContentFormat,
  ExerciseSession,
  ExerciseType,
  LanguageSetting,
  Prisma,
  SessionQuestion,
  SessionStatus,
} from 'generated/prisma';
import { shuffle } from 'src/common/utils/array.utils';
import { normalizeWord } from 'src/common/utils/word.utils';
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
  formats: QuestionFormats;
  filter: MeaningFilter;
}

const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_OPTION_COUNT = 4;

// Minimum pool size required per exercise type (besides MULTIPLE_CHOICE,
// which needs at least `numberOfOptions` meanings).
const MIN_POOL: Partial<Record<ExerciseType, number>> = {
  [ExerciseType.FLASH_CARD]: 1,
  [ExerciseType.WRITING]: 1,
  [ExerciseType.TRUE_FALSE]: 2,
  [ExerciseType.MATCHING]: 2,
  [ExerciseType.FIND_IN_SENTENCE]: 2,
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
          : [];

    if (required.length) {
      pool = pool.filter((m) =>
        required.every(
          (format) =>
            this.questionGenerator.resolveContent(m, format, { exampleOrder }) !==
            null,
        ),
      );
    }

    this.validatePool(pool, settings);

    const selected = shuffle(pool).slice(0, settings.questionCount);
    const questionsData = this.buildQuestionsData(selected, pool, settings);

    return this.prisma.exerciseSession.create({
      data: {
        userId,
        exerciseType: settings.exerciseType,
        languageSetting: settings.languageSetting,
        totalQuestions: questionsData.length,
        questions: { create: questionsData },
      },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });
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
      session.exerciseType,
      question.correctAnswer,
      dto.answer,
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

  private validatePool(
    pool: MeaningWithRelations[],
    settings: EffectiveSettings,
  ): void {
    if (pool.length === 0) {
      throw new BadRequestException(
        'No vocabulary matches the selected filters. Add words or relax the filters.',
      );
    }

    const required =
      settings.exerciseType === ExerciseType.MULTIPLE_CHOICE
        ? settings.numberOfOptions
        : (MIN_POOL[settings.exerciseType] ?? 1);

    if (pool.length < required) {
      throw new BadRequestException(
        `Not enough vocabulary for this exercise. You need at least ${required} matching words.`,
      );
    }
  }

  private buildQuestionsData(
    selected: MeaningWithRelations[],
    pool: MeaningWithRelations[],
    settings: EffectiveSettings,
  ): Prisma.SessionQuestionCreateManySessionInput[] {
    const generated: Array<{ meaningId: string; q: GeneratedQuestion }> =
      settings.exerciseType === ExerciseType.MATCHING
        ? this.questionGenerator
            .generateMatchingQuestions(selected, settings.languageSetting)
            .map((q, i) => ({ meaningId: selected[i].id, q }))
        : selected.map((meaning) => ({
            meaningId: meaning.id,
            q: this.questionGenerator.generateQuestion(
              meaning,
              settings.exerciseType,
              settings.languageSetting,
              pool,
              settings.numberOfOptions,
              settings.formats,
            ),
          }));

    return generated.map(({ meaningId, q }, index) => ({
      meaningId,
      questionOrder: index,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: q.options,
      prompt: q.prompt ?? null,
      partOfSpeech: q.partOfSpeech ?? null,
      ...(q.front && { front: q.front as unknown as Prisma.InputJsonValue }),
      ...(q.back && { back: q.back as unknown as Prisma.InputJsonValue }),
    }));
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
  ): boolean {
    switch (exerciseType) {
      case ExerciseType.FLASH_CARD:
        return userAnswer === 'correct';
      case ExerciseType.WRITING:
        return normalizeWord(userAnswer) === normalizeWord(correctAnswer);
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

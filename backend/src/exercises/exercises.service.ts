import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestionGeneratorService } from './question-generator.service';
import { StartSessionDTO } from './dtos/start-session.dto';
import { AnswerQuestionDTO } from './dtos/answer-question.dto';
import { ExerciseSession, ExerciseType, SessionQuestion, SessionStatus } from 'generated/prisma';
import { shuffle } from 'src/common/utils/array.utils';

type SessionWithQuestions = ExerciseSession & { questions: SessionQuestion[] };

const MIN_MEANINGS_FOR_MC = 4;

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionGenerator: QuestionGeneratorService,
  ) {}

  async startSession(userId: string, dto: StartSessionDTO): Promise<SessionWithQuestions> {
    const { exerciseType, languageSetting, questionCount = 10 } = dto;

    const allMeanings = await this.prisma.wordMeaning.findMany({
      where: { word: { userId } },
      include: { word: true, splittedNativeMeanings: true },
    });

    if (exerciseType === ExerciseType.MULTIPLE_CHOICE && allMeanings.length < MIN_MEANINGS_FOR_MC) {
      throw new BadRequestException(
        `Not enough vocabulary for Multiple Choice. You need at least ${MIN_MEANINGS_FOR_MC} meanings.`,
      );
    }

    if (allMeanings.length === 0) {
      throw new BadRequestException('No vocabulary found. Please add words first.');
    }

    const selectedMeanings = shuffle(allMeanings).slice(0, questionCount);

    const questionsData = selectedMeanings.map((meaning, index) => {
      const generated = this.questionGenerator.generateQuestion(
        meaning,
        exerciseType,
        languageSetting,
        allMeanings,
      );
      return {
        meaningId: meaning.id,
        questionOrder: index,
        questionText: generated.questionText,
        correctAnswer: generated.correctAnswer,
        options: generated.options,
      };
    });

    return this.prisma.exerciseSession.create({
      data: {
        userId,
        exerciseType,
        languageSetting,
        totalQuestions: selectedMeanings.length,
        questions: { create: questionsData },
      },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });
  }

  async getSession(userId: string, sessionId: string): Promise<SessionWithQuestions> {
    return this.findSessionOrThrow(userId, sessionId);
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: AnswerQuestionDTO,
  ): Promise<{ question: SessionQuestion; session: Pick<SessionWithQuestions, 'answeredCount' | 'correctCount' | 'wrongCount' | 'status'> }> {
    const session = await this.findSessionOrThrow(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is already completed or abandoned');
    }

    const question = session.questions.find((q) => q.id === dto.questionId);
    if (!question) {
      throw new NotFoundException('Question not found in this session');
    }

    if (question.isAnswered) {
      throw new BadRequestException('Question has already been answered');
    }

    const isCorrect = this.evaluateAnswer(session.exerciseType, question.correctAnswer, dto.answer);
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
      this.buildUserMeaningStateUpsert(userId, question.meaningId, isCorrect, now),
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

  async getResults(userId: string, sessionId: string): Promise<SessionWithQuestions> {
    const session = await this.findSessionOrThrow(userId, sessionId);

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is not completed yet');
    }

    return session;
  }

  private async findSessionOrThrow(userId: string, sessionId: string): Promise<SessionWithQuestions> {
    const session = await this.prisma.exerciseSession.findFirst({
      where: { id: sessionId, userId },
      include: { questions: { orderBy: { questionOrder: 'asc' } } },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private evaluateAnswer(exerciseType: ExerciseType, correctAnswer: string, userAnswer: string): boolean {
    if (exerciseType === ExerciseType.FLASH_CARD) {
      return userAnswer === 'correct';
    }
    return userAnswer.trim() === correctAnswer.trim();
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

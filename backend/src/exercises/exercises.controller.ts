import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { StartSessionDTO } from './dtos/start-session.dto';
import { AnswerQuestionDTO } from './dtos/answer-question.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { SessionResponseDTO } from './dtos/session-response.dto';
import { SubmitAnswerResponseDTO } from './dtos/submit-answer-response.dto';
import {
  ApiStartSession,
  ApiGetSession,
  ApiSubmitAnswer,
  ApiGetSessionResults,
} from 'src/common/swagger';

@Controller('exercises/sessions')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @Serialize(SessionResponseDTO)
  @ApiStartSession()
  async startSession(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartSessionDTO,
  ) {
    return this.exercisesService.startSession(req.user.id, dto);
  }

  @Get(':sessionId')
  @Serialize(SessionResponseDTO)
  @ApiGetSession()
  async getSession(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.exercisesService.getSession(req.user.id, sessionId);
  }

  @Post(':sessionId/answer')
  @Serialize(SubmitAnswerResponseDTO)
  @ApiSubmitAnswer()
  async submitAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: AnswerQuestionDTO,
  ) {
    return this.exercisesService.submitAnswer(req.user.id, sessionId, dto);
  }

  @Get(':sessionId/results')
  @Serialize(SessionResponseDTO)
  @ApiGetSessionResults()
  async getResults(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.exercisesService.getResults(req.user.id, sessionId);
  }
}

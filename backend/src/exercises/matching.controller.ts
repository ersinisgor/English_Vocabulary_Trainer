import { Body, Controller, Post, Req } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { StartMatchingDTO } from './dtos/start-matching.dto';
import { MatchingResponseDTO } from './dtos/matching-response.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';

@Controller('exercises/matching')
export class MatchingController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @Serialize(MatchingResponseDTO)
  async startMatching(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartMatchingDTO,
  ) {
    return this.exercisesService.startMatching(req.user.id, dto);
  }
}

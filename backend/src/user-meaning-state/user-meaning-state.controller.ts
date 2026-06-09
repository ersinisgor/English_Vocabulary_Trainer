import { Controller, Get, Patch, Param, Req } from '@nestjs/common';
import { UserMeaningStateService } from './user-meaning-state.service';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { UserMeaningStateResponseDTO } from './dtos/user-meaning-state-response.dto';
import {
  ApiGetUserMeaningStates,
  ApiToggleStarMeaning,
  ApiToggleKeepLearningMeaning,
} from 'src/common/swagger';

@Controller('user-meaning-states')
export class UserMeaningStateController {
  constructor(private readonly service: UserMeaningStateService) {}

  @Get()
  @Serialize(UserMeaningStateResponseDTO)
  @ApiGetUserMeaningStates()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAllForUser(req.user.id);
  }

  @Patch(':meaningId/star')
  @Serialize(UserMeaningStateResponseDTO)
  @ApiToggleStarMeaning()
  async toggleStar(
    @Req() req: AuthenticatedRequest,
    @Param('meaningId') meaningId: string,
  ) {
    return this.service.toggleStar(req.user.id, meaningId);
  }

  @Patch(':meaningId/keep-learning')
  @Serialize(UserMeaningStateResponseDTO)
  @ApiToggleKeepLearningMeaning()
  async toggleKeepLearning(
    @Req() req: AuthenticatedRequest,
    @Param('meaningId') meaningId: string,
  ) {
    return this.service.toggleKeepLearning(req.user.id, meaningId);
  }
}

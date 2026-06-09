import { Module } from '@nestjs/common';
import { UserMeaningStateService } from './user-meaning-state.service';
import { UserMeaningStateController } from './user-meaning-state.controller';

@Module({
  controllers: [UserMeaningStateController],
  providers: [UserMeaningStateService],
})
export class UserMeaningStateModule {}

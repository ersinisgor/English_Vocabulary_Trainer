import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { MatchingController } from './matching.controller';
import { QuestionGeneratorService } from './question-generator.service';

@Module({
  controllers: [ExercisesController, MatchingController],
  providers: [ExercisesService, QuestionGeneratorService],
})
export class ExercisesModule {}

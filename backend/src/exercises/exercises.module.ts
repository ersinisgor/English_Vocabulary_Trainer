import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { QuestionGeneratorService } from './question-generator.service';

@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService, QuestionGeneratorService],
})
export class ExercisesModule {}

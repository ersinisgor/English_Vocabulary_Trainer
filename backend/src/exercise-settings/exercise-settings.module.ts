import { Module } from '@nestjs/common';
import { ExerciseSettingsService } from './exercise-settings.service';
import { ExerciseSettingsController } from './exercise-settings.controller';

@Module({
  controllers: [ExerciseSettingsController],
  providers: [ExerciseSettingsService],
  exports: [ExerciseSettingsService],
})
export class ExerciseSettingsModule {}

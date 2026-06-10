import { Module } from '@nestjs/common';
import { WordListsService } from './word-lists.service';
import { WordListsController } from './word-lists.controller';

@Module({
  controllers: [WordListsController],
  providers: [WordListsService],
  exports: [WordListsService],
})
export class WordListsModule {}

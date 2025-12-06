import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  create(@Body() createWordDTO: CreateWordDTO) {
    return this.wordsService.create(createWordDTO);
  }

  @Get()
  findAll() {
    return this.wordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wordsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWordDTO: UpdateWordDTO) {
    return this.wordsService.update(+id, updateWordDTO);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wordsService.remove(+id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { FindWordsQueryDTO } from './dtos/find-words.query.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { WordResponseDTO } from './dtos/word-response.dto';
import {
  ApiCreateWord,
  ApiGetWords,
  ApiGetWordById,
  ApiUpdateWord,
  ApiDeleteWord,
} from 'src/common/swagger';

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  @Serialize(WordResponseDTO)
  @ApiCreateWord()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createWordDTO: CreateWordDTO,
  ) {
    return this.wordsService.create(req.user.id, createWordDTO);
  }

  @Get()
  @ApiGetWords()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: FindWordsQueryDTO) {
    return this.wordsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @Serialize(WordResponseDTO)
  @ApiGetWordById()
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @Serialize(WordResponseDTO)
  @ApiUpdateWord()
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateWordDTO: UpdateWordDTO,
  ) {
    return this.wordsService.update(req.user.id, id, updateWordDTO);
  }

  @Delete(':id')
  @ApiDeleteWord()
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.remove(req.user.id, id);
  }
}

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
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createWordDTO: CreateWordDTO,
  ) {
    return await this.wordsService.create(req.user.id, createWordDTO);
  }

  @Get()
  @ApiGetWords()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindWordsQueryDTO,
  ) {
    return await this.wordsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @Serialize(WordResponseDTO)
  @ApiGetWordById()
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return await this.wordsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @Serialize(WordResponseDTO)
  @ApiUpdateWord()
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateWordDTO: UpdateWordDTO,
  ) {
    return await this.wordsService.update(req.user.id, id, updateWordDTO);
  }

  @Delete(':id')
  @ApiDeleteWord()
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return await this.wordsService.remove(req.user.id, id);
  }
}

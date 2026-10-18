import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { WordListsService } from './word-lists.service';
import { CreateWordListDTO } from './dtos/create-word-list.dto';
import { UpdateWordListDTO } from './dtos/update-word-list.dto';
import { AddWordsDTO } from './dtos/add-words.dto';
import { WordListResponseDTO } from './dtos/word-list-response.dto';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import {
  ApiCreateWordList,
  ApiGetWordLists,
  ApiGetWordListById,
  ApiUpdateWordList,
  ApiDeleteWordList,
  ApiAddWordsToList,
  ApiRemoveWordFromList,
} from 'src/common/swagger';

@Controller('word-lists')
@Serialize(WordListResponseDTO)
export class WordListsController {
  constructor(private readonly wordListsService: WordListsService) {}

  @Post()
  @ApiCreateWordList()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWordListDTO,
  ) {
    return this.wordListsService.create(req.user.id, dto);
  }

  @Get()
  @ApiGetWordLists()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.wordListsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiGetWordListById()
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordListsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiUpdateWordList()
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWordListDTO,
  ) {
    return this.wordListsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiDeleteWordList()
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordListsService.remove(req.user.id, id);
  }

  @Post(':id/words')
  @ApiAddWordsToList()
  async addWords(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddWordsDTO,
  ) {
    return this.wordListsService.addWords(req.user.id, id, dto);
  }

  @Delete(':id/words/:wordId')
  @ApiRemoveWordFromList()
  async removeWord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('wordId') wordId: string,
  ) {
    return this.wordListsService.removeWord(req.user.id, id, wordId);
  }
}

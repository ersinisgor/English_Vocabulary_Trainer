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
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { FindWordsQueryDTO } from './dtos/find-words.query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { PartOfSpeech, WordLevel } from 'generated/prisma';
import { WordPaginationResponse } from './types/word-pagination-result.type';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { WordResponseDTO } from './dtos/word-response.dto';

@ApiTags('Words')
@ApiBearerAuth()
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  @Serialize(WordResponseDTO)
  @ApiOperation({ summary: 'Create a new word' })
  @ApiResponse({ status: 201, description: 'Word created successfully' })
  @ApiResponse({ status: 409, description: 'Word already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createWordDTO: CreateWordDTO,
  ) {
    return this.wordsService.create(req.user.id, createWordDTO);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of words' })
  @ApiResponse({
    status: 200,
    type: WordPaginationResponse,
    description: 'Paginated words list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: WordLevel,
  })
  @ApiQuery({
    name: 'partOfSpeech',
    required: false,
    enum: PartOfSpeech,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'run',
  })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: FindWordsQueryDTO) {
    return this.wordsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @Serialize(WordResponseDTO)
  @ApiOperation({ summary: 'Get a single word by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Word found' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @Serialize(WordResponseDTO)
  @ApiOperation({ summary: 'Update a word' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Word updated' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  @ApiResponse({ status: 409, description: 'Word conflict' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateWordDTO: UpdateWordDTO,
  ) {
    return this.wordsService.update(req.user.id, id, updateWordDTO);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a word' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Word deleted' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.remove(req.user.id, id);
  }
}

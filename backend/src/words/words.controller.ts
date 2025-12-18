import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { CreateWordDTO } from './dtos/create-word.dto';
import { UpdateWordDTO } from './dtos/update-word.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createWordDTO: CreateWordDTO,
  ) {
    return this.wordsService.create(req.user.id, createWordDTO);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.wordsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateWordDTO: UpdateWordDTO,
  ) {
    return this.wordsService.update(req.user.id, id, updateWordDTO);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.wordsService.remove(req.user.id, id);
  }
}

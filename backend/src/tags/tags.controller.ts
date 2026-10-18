import { Controller, Get, Req } from '@nestjs/common';
import { TagsService } from './tags.service';
import { AuthenticatedRequest } from 'src/auth/types/interfaces/authenticated-request.interface';
import { ApiGetTags } from 'src/common/swagger';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiGetTags()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.tagsService.findAllForUser(req.user.id);
  }
}

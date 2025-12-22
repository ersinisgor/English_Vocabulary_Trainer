import { ApiProperty } from '@nestjs/swagger';
import { WordResponseDTO } from '../dtos/word-response.dto';

class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class WordPaginationResponse {
  @ApiProperty({ type: () => [WordResponseDTO] })
  data: WordResponseDTO[];

  @ApiProperty({ type: () => PaginationMeta })
  meta: PaginationMeta;
}

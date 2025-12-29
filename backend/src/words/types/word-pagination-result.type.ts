import { WordResponseDTO } from '../dtos/word-response.dto';

class PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export class WordPaginationResponse {
  data: WordResponseDTO[];
  meta: PaginationMeta;
}

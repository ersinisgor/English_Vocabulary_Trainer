import { Expose, Type } from 'class-transformer';
import { WordResponseDTO } from 'src/words/dtos/word-response.dto';

class WordListItemResponseDTO {
  @Expose()
  @Type(() => WordResponseDTO)
  word: WordResponseDTO;
}

export class WordListResponseDTO {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  userId: string;

  @Expose()
  folderId: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => WordListItemResponseDTO)
  items?: WordListItemResponseDTO[];
}

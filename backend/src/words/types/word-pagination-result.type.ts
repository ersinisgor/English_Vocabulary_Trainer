import { Word } from 'generated/prisma';

export type WordPaginationResult = {
  data: Word[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

import { Expose, Type } from 'class-transformer';

export class MatchingPairDTO {
  // Stable id of the underlying meaning; the two cards of a pair share it.
  @Expose()
  pairId: string;

  // English word.
  @Expose()
  first: string;

  // First split of the native meaning (a single clean term, never a list).
  @Expose()
  second: string;
}

export class MatchingResponseDTO {
  @Expose()
  @Type(() => MatchingPairDTO)
  pairs: MatchingPairDTO[];
}

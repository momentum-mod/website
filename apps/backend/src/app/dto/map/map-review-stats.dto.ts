import { MapReviewStats } from '@momentum/constants';
import { Exclude } from 'class-transformer';
import { IsInt } from 'class-validator';

export class MapReviewStatsDto implements MapReviewStats {
  @Exclude()
  readonly mapID: number;

  @IsInt()
  readonly total: number;

  @IsInt()
  readonly approvals: number;

  @IsInt()
  readonly resolved: number;

  @IsInt()
  readonly unresolved: number;
}

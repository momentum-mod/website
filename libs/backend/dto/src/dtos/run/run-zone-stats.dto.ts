import { RunZoneStats } from '@momentum/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsPositive } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  UpdatedAtProperty
} from '../../decorators';

export class RunZoneStatsDto implements RunZoneStats {
  @ApiProperty()
  readonly id: number;

  @ApiProperty()
  @IsPositive()
  readonly zoneNum: number;

  @IdProperty({ bigint: true })
  readonly runID: number;

  @IdProperty({ bigint: true })
  readonly baseStatsID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

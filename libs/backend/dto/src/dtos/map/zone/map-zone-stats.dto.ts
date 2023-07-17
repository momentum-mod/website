import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { BaseStatsDto } from '../../stats/base-stats.dto';
import { NestedProperty } from '../../../decorators';
import { MapZoneStats } from '@momentum/constants';
import { Exclude } from 'class-transformer';

export class MapZoneStatsDto implements MapZoneStats {
  @ApiProperty()
  @IsInt()
  readonly completions: number;

  @ApiProperty()
  @IsInt()
  readonly uniqueCompletions: number;

  @NestedProperty(BaseStatsDto, { required: false })
  readonly baseStats?: BaseStatsDto;

  @Exclude()
  readonly zoneID: number;

  @Exclude()
  readonly baseStatsID: number;
}

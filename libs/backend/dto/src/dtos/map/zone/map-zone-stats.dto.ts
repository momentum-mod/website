import { MapZoneStats } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { BaseStatsDto } from '../../stats/base-stats.dto';
import { NestedProperty } from '../../../decorators';
import { PrismaModelToDto } from '../../../types';

export class MapZoneStatsDto implements PrismaModelToDto<MapZoneStats> {
  @Exclude()
  readonly id: number;

  @ApiProperty()
  @IsInt()
  readonly completions: number;

  @ApiProperty()
  @IsInt()
  readonly uniqueCompletions: number;

  @Exclude()
  readonly zoneID: number;

  @Exclude()
  readonly baseStatsID: number;

  @NestedProperty(BaseStatsDto, { required: false })
  readonly baseStats?: BaseStatsDto;

  @Exclude()
  readonly createdAt: Date;

  @Exclude()
  readonly updatedAt: Date;
}

import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsDefined, IsInt, Max } from 'class-validator';
import { MapZoneTriggerDto } from './map-zone-trigger.dto';
import { MapZoneStatsDto } from './map-zone-stats.dto';
import { IdProperty, NestedProperty } from '../../../decorators';
import { MapZone } from '@momentum/constants';
import { Exclude } from 'class-transformer';

export class MapZoneDto implements MapZone {
  @Exclude()
  readonly id: number;

  @ApiProperty()
  @IsInt()
  @Max(64)
  readonly zoneNum: number;

  @IdProperty()
  readonly trackID: number;

  @NestedProperty(MapZoneStatsDto, { isArray: true })
  readonly stats: MapZoneStatsDto[];

  @NestedProperty(MapZoneTriggerDto, { isArray: true })
  readonly triggers: MapZoneTriggerDto[];
}

export class CreateMapZoneDto extends PickType(MapZoneDto, [
  'zoneNum'
] as const) {
  @IsDefined()
  readonly triggers: MapZoneTriggerDto[];
}

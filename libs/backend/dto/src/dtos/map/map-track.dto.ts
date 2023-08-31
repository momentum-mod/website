import { CreateMapTrack, MapTrack } from '@momentum/constants';
import { Exclude } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsPositive,
  Max
} from 'class-validator';
import { CreateMapZoneDto, MapZoneDto } from './zone/map-zone.dto';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';

export class MapTrackDto implements MapTrack {
  @IdProperty()
  readonly id: number;

  @ApiProperty()
  @IsInt()
  @Max(64)
  readonly trackNum: number;

  @ApiProperty()
  @IsPositive()
  @Max(64)
  readonly numZones: number;

  @ApiProperty()
  @IsBoolean()
  readonly isLinear: boolean;

  @ApiProperty()
  @IsPositive()
  @Max(10)
  readonly difficulty: number;

  @NestedProperty(MapZoneDto, { isArray: true })
  readonly zones: MapZoneDto[];

  @Exclude()
  readonly mapID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateMapTrackDto
  extends PickType(MapTrackDto, [
    'trackNum',
    'isLinear',
    'numZones',
    'difficulty'
  ] as const)
  implements CreateMapTrack
{
  @NestedProperty(CreateMapZoneDto, { isArray: true })
  @IsArray()
  @ArrayMinSize(2)
  readonly zones: CreateMapZoneDto[];
}

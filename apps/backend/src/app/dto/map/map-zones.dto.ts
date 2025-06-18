import {
  MapZones,
  Region,
  MapTracks,
  Vector2D,
  Vector,
  Zone,
  MainTrack,
  BonusTrack,
  GlobalRegions,
  TrackZones
} from '@momentum/constants';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  MAX_REGIONS,
  MAX_BONUS_TRACKS,
  MAX_SEGMENT_CHECKPOINTS,
  MAX_TRACK_SEGMENTS,
  MAX_ZONE_REGION_POINTS
} from '@momentum/formats/zone';
import { IsVector } from '../../validators';
import { NestedProperty } from '../decorators';

export class RegionDto /* extends JsonifiableDto */ implements Region {
  @ApiProperty({
    description:
      'A collection of 2-tuples of floats representing points in the XY plane, describing the shape of the zone from a top-down view.',
    example: '[[0, 0], [0, 512], [512, 0], [512, 512]]'
  })
  @ArrayMaxSize(MAX_ZONE_REGION_POINTS)
  @IsVector(2, { each: true })
  readonly points: Vector2D[];

  @ApiProperty({
    description:
      'The Z coordinate of all the points in the "points" collection, forming the bottom of the region.',
    example: 0
  })
  @IsNumber()
  readonly bottom: number;

  @ApiProperty({
    description:
      'The height of the zone, effectively Z coordinate of the points in the "points" collection at the top of the region.',
    example: 512
  })
  @IsNumber()
  readonly height: number;

  @ApiProperty({
    description:
      'A 3-tuple of floats representing the location in the XYZ plane the player is placed at when teleported into the region.' +
      'Should *generally correspond to an `info_teleport_destination.`' +
      'Required if the region is part of a volume used by a start or major checkpoint zone, otherwise optional.',
    example: '[512, 512, 0]'
  })
  @IsVector(3)
  @IsOptional()
  readonly teleDestPos?: Vector;

  @ApiProperty({
    description:
      'The yaw angle in degrees the player faces when teleported into the region.' +
      'Required if the region is part of a volume used by a start or major checkpoint zone, otherwise optional.',
    example: 90
  })
  @IsNumber()
  @Min(-360)
  @Max(360)
  @IsOptional()
  readonly teleDestYaw?: number;

  @ApiProperty({
    description:
      'The name of the teleport destination entity that the player is teleported' +
      ' to when teleported into the region.'
  })
  @IsString()
  @IsOptional()
  readonly teleDestTargetname?: string;

  @ApiProperty({
    description:
      'The "safe height" is the greatest height from the base of the region that the player is allowed to enter "primed" state from - see the docs for a detailed explanation.' +
      'If not included, the game uses a default value of -1, which indicates that the entire region is also the safe region.'
  })
  @IsNumber()
  @IsOptional()
  readonly safeHeight?: number;
}

export class ZoneDto /* extends JsonifiableDto */ implements Zone {
  @ApiProperty({ description: '`targetname` of a filter entity on the map.' })
  @IsString()
  @IsOptional()
  readonly filtername: string;

  @NestedProperty(RegionDto, {
    isArray: true,
    description:
      'A collection of regions. In most cases just a single region, but the format is structured this way so multiple are possible.'
  })
  readonly regions: RegionDto[];
}

export class SegmentDto /* extends JsonifiableDto */ implements SegmentDto {
  @ApiProperty({
    description:
      'If enabled, prevents the player from bhopping in start zones, even with the timer running.'
  })
  @IsBoolean()
  readonly limitStartGroundSpeed: boolean;

  @ApiProperty({
    description: 'Whether the checkpoints must be hit'
  })
  @IsBoolean()
  readonly checkpointsRequired: boolean;

  @ApiProperty({
    description: 'Whether the checkpoints have a logical order.'
  })
  @IsBoolean()
  readonly checkpointsOrdered: boolean;

  @NestedProperty(ZoneDto, {
    isArray: true,
    description: 'A collection of checkpoint zones'
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SEGMENT_CHECKPOINTS)
  readonly checkpoints: ZoneDto[];

  @NestedProperty(ZoneDto, { isArray: true })
  readonly cancel: ZoneDto[];

  @ApiProperty({
    description: 'An optional name for the track',
    example: "Panzer's Bonus"
  })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  readonly name?: string;
}

class TrackZonesDto /* extends JsonifiableDto */ implements TrackZones {
  @NestedProperty(SegmentDto, { isArray: true })
  @ArrayMaxSize(MAX_TRACK_SEGMENTS)
  readonly segments: SegmentDto[];

  @NestedProperty(ZoneDto, { description: 'The end zone of the track' })
  readonly end: ZoneDto;
}

export class MainTrackDto /* extends JsonifiableDto */ implements MainTrack {
  @NestedProperty(TrackZonesDto)
  readonly zones: TrackZonesDto;

  @ApiProperty({
    required: true,
    description:
      'Whether the stage end zones are generated using the next stage start zones'
  })
  @IsBoolean()
  readonly stagesEndAtStageStarts: boolean;

  @ApiProperty({
    required: false,
    description:
      "Overrides the game mode's settings to allow bhopping on this track"
  })
  @IsBoolean()
  @IsOptional()
  readonly bhopEnabled?: boolean;
}

export class BonusTrackDto /* extends JsonifiableDto */ implements BonusTrack {
  @NestedProperty(TrackZonesDto, { required: false })
  readonly zones?: TrackZonesDto;

  @ApiProperty({ description: 'Defrag gameplay modifications' }) // TODO: Enum
  @IsInt()
  @IsOptional()
  readonly defragModifiers?: number;

  @ApiProperty({
    required: false,
    description:
      "Overrides the game mode's settings to allow bhopping on this track"
  })
  @IsBoolean()
  @IsOptional()
  readonly bhopEnabled?: boolean;
}

export class MapTracksDto /* extends JsonifiableDto */ implements MapTracks {
  @NestedProperty(MainTrackDto, {
    required: true,
    description: 'The main track of the map'
  })
  readonly main: MainTrackDto;

  @NestedProperty(BonusTrackDto, {
    isArray: true,
    required: false,
    description: 'A collection of bonus tracks'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_BONUS_TRACKS)
  readonly bonuses: BonusTrackDto[];
}

export class GlobalRegionsDto /* extends JsonifiableDto */
  implements GlobalRegions
{
  @NestedProperty(RegionDto, {
    isArray: true,
    required: false,
    description: 'A collection of allow bhop regions'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_REGIONS)
  readonly allowBhop: RegionDto[];

  @NestedProperty(RegionDto, {
    isArray: true,
    required: false,
    description: 'A collection of overbounce regions'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_REGIONS)
  readonly overbounce: RegionDto[];
}

export class MapZonesDto /* extends JsonifiableDto */ implements MapZones {
  @ApiProperty()
  @IsInt()
  readonly dataTimestamp: number;

  @ApiProperty()
  @IsInt()
  readonly formatVersion: number;

  @ApiProperty({
    description: 'The sv_maxvelocity value set on the map',
    default: 3500
  })
  @IsNumber()
  @Min(1)
  @Max(1000000000)
  @IsOptional()
  readonly maxVelocity?: number;

  @NestedProperty(MapTracksDto, { required: true })
  readonly tracks: MapTracksDto;

  @NestedProperty(GlobalRegionsDto, { required: false })
  @IsOptional()
  readonly globalRegions?: GlobalRegionsDto;
}

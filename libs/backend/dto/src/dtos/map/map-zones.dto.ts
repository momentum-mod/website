import {
  MapZones,
  Region,
  Tracks,
  Vector2D,
  Vector,
  Volume,
  Zone,
  Track,
  TrackEx
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
import { IsVector } from '@momentum/backend/validators';
import { ApiProperty } from '@nestjs/swagger';
import { NestedProperty } from '../../decorators';
import {
  MAX_BONUS_TRACKS,
  MAX_SEGMENT_CHECKPOINTS,
  MAX_STAGE_TRACKS,
  MAX_TRACK_SEGMENTS,
  MAX_ZONE_REGION_POINTS
} from '@momentum/formats';

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
  readonly teleportPos?: Vector;

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
  readonly teleportYaw?: number;

  @ApiProperty({
    description:
      'The "safe height" is the greatest height from the base of the region that the player is allowed to enter "primed" state from - see the docs for a detailed explanation.' +
      'If not included, the game uses a default value of -1, which indicates that the entire region is also the safe region.'
  })
  @IsNumber()
  @IsOptional()
  readonly safeHeight?: number;
}

export class VolumeDto /* extends JsonifiableDto */ implements Volume {
  @NestedProperty(RegionDto, {
    isArray: true,
    description:
      'A collection of regions. In most cases just a single region, but the format is structured this way so multiple are possible.'
  })
  readonly regions: RegionDto[];
}

export class ZoneDto /* extends JsonifiableDto */ implements Zone {
  @ApiProperty({ description: '`targetname` of a filter entity on the map.' })
  @IsString()
  @IsOptional()
  readonly filterName: string;

  @ApiProperty({
    description:
      'Index into the `volumes` array picking out the volume representing the region(s) of space the zone occupies.'
  })
  @IsInt()
  readonly volumeIndex: number;
}

export class SegmentDto /* extends JsonifiableDto */ implements SegmentDto {
  @ApiProperty({
    description:
      'If enabled, prevents the player from bhopping in start zones, even with the timer running.'
  })
  @IsBoolean()
  readonly limitStartGroundSpeed: boolean;

  @NestedProperty(ZoneDto, {
    isArray: true,
    description: 'A collection of checkpoint zones'
  })
  @ArrayMaxSize(MAX_SEGMENT_CHECKPOINTS)
  readonly checkpoints: ZoneDto[];
}

class TrackZonesDto /* extends JsonifiableDto */ {
  @NestedProperty(SegmentDto, { isArray: true })
  @ArrayMaxSize(MAX_TRACK_SEGMENTS)
  readonly segments: SegmentDto[];

  @NestedProperty(ZoneDto, { description: 'The end zone of the track' })
  readonly end: ZoneDto;

  @NestedProperty(ZoneDto, { isArray: true })
  readonly cancel: ZoneDto[];
}

export class TrackDto /* extends JsonifiableDto */ implements Track {
  @ApiProperty({
    description: 'Whether the major zones must be hit in required order'
  })
  @IsBoolean()
  @IsOptional()
  readonly majorOrdered: boolean;

  @ApiProperty({ description: "Whether it's possible to skip a minor zone" })
  @IsBoolean()
  readonly minorRequired: boolean;

  @ApiProperty({
    description: 'An optional name for the track',
    example: '' // TODO: We haven't fully figured out naming yet
  })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  readonly name?: string;

  @NestedProperty(TrackZonesDto)
  readonly zones: TrackZonesDto;
}

export class TrackExDto
  extends TrackDto /* extends JsonifiableDto */
  implements TrackEx
{
  @ApiProperty({
    description: 'The sv_maxvelocity value set on the track',
    default: 3500
  })
  @IsNumber()
  @Min(2000)
  @Max(1000000000)
  @IsOptional()
  readonly maxVelocity?: number;

  @ApiProperty({ description: 'Defrag gameplay modifications' }) // TODO: Enum
  @IsInt()
  @IsOptional()
  readonly defragFlags?: number;
}

export class TracksDto /* extends JsonifiableDto */ implements Tracks {
  @NestedProperty(TrackExDto, {
    required: true,
    description: 'The main track of the map'
  })
  readonly main: TrackExDto;

  @NestedProperty(TrackDto, {
    isArray: true,
    required: true,
    description: 'A collection of stage tracks'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_STAGE_TRACKS)
  readonly stages: TrackDto[];

  @NestedProperty(TrackDto, {
    isArray: true,
    required: false,
    description: 'A collection of bonus tracks'
  })
  @ArrayMinSize(0)
  @ArrayMaxSize(MAX_BONUS_TRACKS)
  readonly bonuses: TrackExDto[];
}

export class MapZonesDto /* extends JsonifiableDto */ implements MapZones {
  @ApiProperty()
  @IsInt()
  readonly dataTimestamp: number;

  @ApiProperty()
  @IsInt()
  readonly formatVersion: number;

  @NestedProperty(TracksDto, { required: true })
  readonly tracks: Tracks;

  @NestedProperty(VolumeDto, {
    required: true,
    isArray: true
  })
  readonly volumes: Volume[];
}

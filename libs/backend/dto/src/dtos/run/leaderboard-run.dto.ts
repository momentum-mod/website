import {
  Gamemode,
  LeaderboardRun,
  runPath,
  RunStats,
  Style,
  TrackType
} from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
  IsHash,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl
} from 'class-validator';
import { MapDto } from '../map/map.dto';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../../decorators';
import { Config } from '@momentum/backend/config';
import { LeaderboardDto } from './leaderboard.dto';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class LeaderboardRunDto implements LeaderboardRun {
  @EnumProperty(Gamemode, { description: 'The gamemode the run took place in' })
  readonly gamemode: number;

  @EnumProperty(TrackType, {
    description: 'The trackNum the run took place on'
  })
  readonly trackType: number;

  @ApiProperty({
    type: Number,
    description: 'The trackNum the run took place on'
  })
  readonly trackNum: number;

  @EnumProperty(Style, { description: 'The trackNum the run took place on' })
  readonly style: number;

  @ApiProperty({
    type: Number,
    description: 'The overall time of the run (ticks * tickRate)'
  })
  @IsNumber()
  readonly time: number;

  @ApiProperty({
    type: String,
    description:
      'URL to download in S3 storage. Not available when the run is awaiting validating.'
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    return `${ENDPOINT_URL}/${BUCKET}/${runPath(this.replayHash)}`;
  }

  @ApiProperty({
    description:
      'Hash of the replay file. Not available when the run is awaiting validating.'
  })
  @IsHash('sha1')
  @IsOptional()
  readonly replayHash: string;

  @ApiProperty({
    type: Number,
    isArray: true,
    description: 'Array of all the style flags that run qualified for'
  })
  @IsInt({ each: true })
  readonly flags: number[];

  @ApiProperty({ description: 'WIP run stats data' })
  readonly stats: RunStats;

  @ApiProperty({
    type: Number,
    description: 'Rank on the corresponding leaderboard'
  })
  @IsInt()
  readonly rank: number;

  @ApiProperty({
    type: Number,
    description: 'Rank XP for the run'
  })
  @IsInt()
  readonly rankXP: number;

  @ApiProperty()
  @IsPositive()
  readonly userID: number;

  @NestedProperty(UserDto, { required: false, lazy: true })
  readonly user: UserDto;

  @IdProperty()
  @IsOptional()
  readonly mapID?: number;

  @NestedProperty(MapDto, { required: false })
  @Expose()
  get map(): MapDto {
    return plainToInstance(MapDto, this.mmap);
  }

  @IdProperty({ bigint: true })
  readonly pastRunID: number;

  @Exclude()
  readonly mmap: MapDto;

  @NestedProperty(LeaderboardDto, { required: false })
  readonly leaderboard: LeaderboardDto;

  @CreatedAtProperty()
  readonly createdAt: Date;
}

export class MinimalLeaderboardRunDto extends OmitType(LeaderboardRunDto, [
  'mapID',
  'gamemode',
  'trackType',
  'trackNum',
  'style'
] as const) {}

import {
  DateString,
  Gamemode,
  LeaderboardRun,
  RunSplits,
  Style,
  TrackType
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { UserDto } from '../user/user.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';
import { LeaderboardDto } from './leaderboard.dto';

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
  @Min(1)
  readonly trackNum: number;

  @EnumProperty(Style, { description: 'The style of the run' })
  readonly style: number;

  @ApiProperty({
    type: Number,
    description: 'The overall time of the run (ticks * tickRate)'
  })
  @IsNumber()
  readonly time: number;

  @Exclude()
  readonly replayHash: string;

  @ApiProperty({
    type: Number,
    isArray: true,
    description: 'Array of all the style flags that run qualified for'
  })
  @IsInt({ each: true })
  readonly flags: number[];

  @ApiProperty()
  @IsOptional()
  readonly splits?: RunSplits.Splits;

  @ApiProperty({
    type: Number,
    description: 'Rank on the corresponding leaderboard'
  })
  @IsInt()
  readonly rank: number;

  // @ApiProperty({
  //   type: Number,
  //   description: 'Rank XP for the run'
  // })
  // @IsInt()
  // readonly rankXP: number;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { required: false, lazy: true })
  readonly user: UserDto;

  @IdProperty({ required: false })
  readonly mapID: number;

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
  readonly createdAt: DateString;
}

export class AdminDeleteRunDto {
  @IdProperty()
  readonly mapID: number;

  @IdProperty()
  readonly userID: number;

  @ApiProperty()
  @IsEnum(Gamemode)
  gamemode: Gamemode;

  @ApiProperty()
  @IsEnum(TrackType)
  trackType = TrackType.MAIN;

  @ApiProperty()
  @IsInt()
  @Min(1)
  trackNum = 1;

  @ApiProperty()
  @IsEnum(Style)
  style = Style.NORMAL;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly reason?: string;
}

export class AdminDeleteAllRunsDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly reason?: string;
}

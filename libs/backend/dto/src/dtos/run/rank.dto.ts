import { Rank } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { MapDto } from '../map/map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from './run.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { Gamemode } from '@momentum/constants';

export class RankDto implements Rank {
  @IdProperty()
  readonly id: number;

  @EnumProperty(Gamemode)
  readonly gameType: Gamemode;

  @ApiProperty({ description: 'Unimplemented' })
  readonly flags: number;

  // TODO_POST_REWRITE: We can remove this and zoneNum in the future since DB
  // no longer stores dupes of this and zoneNum, but still expect a DTO with
  // this structure seem to use it from here.
  @ApiProperty({ description: 'The track the run is on' })
  @IsInt()
  @IsOptional()
  readonly trackNum: number;

  @ApiProperty({
    description: 'The zone the run is on. > 0 is a IL run, not yet supported'
  })
  @IsInt()
  @IsOptional()
  readonly zoneNum: number;

  @ApiProperty({ description: 'The leaderboard rank of the run' })
  @IsPositive()
  readonly rank: number;

  @ApiProperty({ description: 'The ranked XP assigned for the run' })
  @IsInt()
  readonly rankXP: number;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true })
  readonly map: MapDto;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty({ bigint: true })
  readonly runID: number;

  @NestedProperty(RunDto)
  readonly run: RunDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

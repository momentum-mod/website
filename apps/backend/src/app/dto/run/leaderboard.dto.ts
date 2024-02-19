import {
  Gamemode,
  Leaderboard,
  MapTags,
  Style,
  TrackType
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { EnumProperty } from '../decorators';

export class LeaderboardDto implements Leaderboard {
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
  @IsInt()
  readonly trackNum: number;

  @EnumProperty(Style, { description: 'The trackNum the run took place on' })
  readonly style: number;

  @Exclude()
  readonly mapID: number;

  @ApiProperty({ type: Number, description: 'The tier of the leaderboard' })
  @IsInt()
  @IsOptional()
  readonly tier: number;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'The tags of the leaderboard (WIP)'
  })
  @IsString({ each: true })
  readonly tags: MapTags;

  @ApiProperty({
    type: Boolean,
    description: 'Whether leaderboard runs provide rank points'
  })
  @IsBoolean()
  readonly ranked: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Whether leaderboard corresponds to a linear track'
  })
  @IsBoolean()
  @IsOptional()
  readonly linear: boolean;
}

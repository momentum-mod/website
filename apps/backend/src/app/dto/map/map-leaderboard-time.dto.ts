import {
  Gamemode,
  MapLeaderboardTime,
  Style,
  TrackType
} from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { EnumProperty } from '../decorators';
import { IsSteamCommunityID } from '../../validators';

export class MapLeaderboardTimeDto implements MapLeaderboardTime {
  @EnumProperty(Gamemode, { description: 'The gamemode the run took place in' })
  readonly gamemode: Gamemode;

  @EnumProperty(TrackType, {
    description: 'The type of track (main, stage or bonus)'
  })
  readonly trackType: TrackType;

  @ApiProperty({ type: Number, description: 'The track number' })
  @IsInt()
  @Min(1)
  readonly trackNum: number;

  @EnumProperty(Style, { description: 'The style of the run' })
  readonly style: Style;

  @ApiProperty({
    type: Number,
    description: 'The overall time of the run (ticks * tickRate)'
  })
  @IsNumber()
  readonly time: number;

  @ApiPropertyOptional({
    type: String,
    description:
      'The Steam community ID of the player who set the time. Only sent for ' +
      'the world record'
  })
  @IsOptional()
  @IsSteamCommunityID()
  readonly steamID?: string;
}

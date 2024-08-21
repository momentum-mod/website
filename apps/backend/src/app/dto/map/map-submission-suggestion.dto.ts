import {
  Gamemode,
  LeaderboardType,
  MapSubmissionSuggestion,
  MAX_MAP_SUGGESTION_COMMENT_LENGTH,
  TrackType
} from '@momentum/constants';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JsonValue } from 'type-fest';
import { EnumProperty } from '../decorators';

export class MapSubmissionSuggestionDto implements MapSubmissionSuggestion {
  [k: string]: JsonValue;

  @ApiProperty({ description: 'Track number the suggestion refers to' })
  @IsInt()
  @Min(1)
  readonly trackNum: number;

  @EnumProperty(TrackType, {
    description: 'Type of track the suggestion refers to'
  })
  readonly trackType: number;

  @EnumProperty(Gamemode, { description: 'Gamemode the suggestion is for' })
  readonly gamemode: Gamemode;

  @ApiProperty({ description: 'Suggested tier for the track and gamemode' })
  @IsInt()
  @Min(1)
  @Max(10)
  readonly tier: number;

  @EnumProperty(
    {
      [LeaderboardType.RANKED]: LeaderboardType.RANKED,
      [LeaderboardType.UNRANKED]: LeaderboardType.UNRANKED
    },
    {
      description: 'Type of leaderboard, ranked, unranked or hidden'
    }
  )
  readonly type: LeaderboardType.RANKED | LeaderboardType.UNRANKED;

  @ApiProperty({
    description: 'General comments about the track on this gamemode'
  })
  @IsString()
  @MaxLength(MAX_MAP_SUGGESTION_COMMENT_LENGTH)
  @IsOptional()
  readonly comment?: string;
}

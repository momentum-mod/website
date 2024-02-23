import {
  Gamemode,
  LeaderboardType,
  MapSubmissionApproval,
  TrackType
} from '@momentum/constants';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JsonValue } from 'type-fest';
import { EnumProperty } from '../decorators';

export class MapSubmissionApprovalDto implements MapSubmissionApproval {
  [k: string]: JsonValue;

  @ApiProperty({ description: 'Track number the suggestion refers to' })
  @IsInt()
  readonly trackNum: number;

  @EnumProperty(TrackType, {
    description: 'Type of track the suggestion refers to'
  })
  readonly trackType: number;

  @EnumProperty(Gamemode, { description: 'Gamemode the suggestion is for' })
  readonly gamemode: Gamemode;

  @ApiProperty({ description: 'Suggested tier for the track and gamemode' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  readonly tier: number;

  @EnumProperty({
    [LeaderboardType.RANKED]: LeaderboardType.RANKED,
    [LeaderboardType.UNRANKED]: LeaderboardType.UNRANKED,
    [LeaderboardType.HIDDEN]: LeaderboardType.HIDDEN
  })
  readonly type:
    | LeaderboardType.RANKED
    | LeaderboardType.UNRANKED
    | LeaderboardType.HIDDEN;
}

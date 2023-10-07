import {
  Gamemode,
  MapSubmissionApproval,
  TrackType
} from '@momentum/constants';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnumProperty } from '../../decorators';
import { JsonValue } from 'type-fest';

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
  @Min(1)
  @Max(10)
  readonly tier: number;

  @ApiProperty({
    description: 'Whether the track should be ranked for this gamemode'
  })
  @IsBoolean()
  @IsOptional()
  readonly ranked: boolean;
}

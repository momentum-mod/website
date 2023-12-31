import {
  Gamemode,
  MapSubmissionSuggestion,
  MAX_MAP_SUGGESTION_COMMENT_LENGTH,
  TrackType
} from '@momentum/constants';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnumProperty } from '../decorators';
import { JsonValue } from 'type-fest';

export class MapSubmissionSuggestionDto implements MapSubmissionSuggestion {
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
  readonly ranked: boolean;

  @ApiProperty({
    description: 'General comments about the track on this gamemode'
  })
  @IsString()
  @MaxLength(MAX_MAP_SUGGESTION_COMMENT_LENGTH)
  @IsOptional()
  readonly comment?: string;
}

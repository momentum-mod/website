import {
  Gamemode,
  MapReviewSuggestion,
  MapTag,
  TrackType
} from '@momentum/constants';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnumProperty } from '../decorators';

export class MapReviewSuggestionDto implements MapReviewSuggestion {
  @ApiProperty({ description: 'Track number the suggestion refers to' })
  @IsInt()
  @Min(1)
  readonly trackNum: number;

  @ApiProperty({ description: 'Track type the suggestion refers to' })
  @IsInt()
  readonly trackType: TrackType;

  @EnumProperty(Gamemode, { description: 'Gamemode the suggestion is for' })
  readonly gamemode: Gamemode;

  @ApiProperty({ description: 'Track number the suggestion refers to' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  readonly tier: number;

  @ApiProperty({ description: 'Gameplay rating out of 10' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  readonly gameplayRating: number;

  @ApiProperty({ description: 'Array of tags' })
  @IsEnum(MapTag, { each: true })
  @IsOptional()
  readonly tags?: MapTag[];
}

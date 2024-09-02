import { ApiProperty } from '@nestjs/swagger';
import { MapSubmission, MapSubmissionType } from '@momentum/constants';
import { IsArray, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';
import { NestedProperty } from '../decorators';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { MapSubmissionDateDto } from './map-submission-dates.dto';
import { MapSubmissionPlaceholderDto } from './map-submission-placeholder.dto';

export class MapSubmissionDto implements MapSubmission {
  @ApiProperty({
    description:
      'Whether the submission is an original map, a port, or something unusual'
  })
  readonly type: MapSubmissionType;

  @NestedProperty(MapSubmissionSuggestionDto, { isArray: true })
  readonly suggestions: MapSubmissionSuggestionDto[];

  @NestedProperty(MapSubmissionPlaceholderDto, { isArray: true })
  @IsArray()
  @IsOptional()
  readonly placeholders: MapSubmissionPlaceholderDto[];

  @NestedProperty(MapSubmissionDateDto, { isArray: true })
  @IsArray()
  @IsOptional()
  readonly dates: MapSubmissionDateDto[];

  @Exclude()
  readonly mapID: number;
}

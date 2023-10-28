import { ApiProperty } from '@nestjs/swagger';
import { MapSubmission, MapSubmissionType } from '@momentum/constants';
import { NestedProperty } from '../../decorators';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { Exclude } from 'class-transformer';
import { MapSubmissionVersionDto } from './map-submission-version.dto';
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

  @NestedProperty(MapSubmissionVersionDto, { required: false })
  readonly currentVersion: MapSubmissionVersionDto;

  @ApiProperty()
  @IsUUID()
  readonly currentVersionID: string;

  @NestedProperty(MapSubmissionVersionDto, { required: false, isArray: true })
  readonly versions: MapSubmissionVersionDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import {
  MapCreditType,
  MapSubmission,
  MapSubmissionType
} from '@momentum/constants';
import { EnumProperty, NestedProperty } from '../../decorators';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { Exclude } from 'class-transformer';
import { MapSubmissionVersionDto } from './map-submission-version.dto';
import { JsonValue } from 'type-fest';
import { MapSubmissionDatesDto } from './map-submission-dates.dto';

export class PlaceholderSuggestionDto {
  [k: string]: JsonValue;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  readonly alias: string;

  @EnumProperty(MapCreditType)
  readonly type: MapCreditType;
}

export class MapSubmissionDto implements MapSubmission {
  @ApiProperty({
    description:
      'Whether the submission is an original map, a port, or something unusual'
  })
  readonly type: MapSubmissionType;

  @NestedProperty(MapSubmissionSuggestionDto, { isArray: true })
  readonly suggestions: MapSubmissionSuggestionDto[];

  @NestedProperty(PlaceholderSuggestionDto, { required: true, isArray: true })
  @IsArray()
  @IsOptional()
  readonly placeholders: PlaceholderSuggestionDto[];

  @NestedProperty(MapSubmissionDatesDto)
  readonly dates: MapSubmissionDatesDto;

  @Exclude()
  readonly mapID: number;

  @NestedProperty(MapSubmissionVersionDto, { required: true })
  readonly currentVersion: MapSubmissionVersionDto;

  @ApiProperty()
  @IsUUID()
  readonly currentVersionID: string;

  @NestedProperty(MapSubmissionVersionDto, { required: true, isArray: true })
  readonly versions: MapSubmissionVersionDto[];
}

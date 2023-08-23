import { ApiProperty } from '@nestjs/swagger';
import {
  MapCreditType,
  MapSubmission,
  MapSubmissionType
} from '@momentum/constants';
import { EnumProperty, IdProperty, NestedProperty } from '../../decorators';
import { CreateMapInfoDto } from './map-info.dto';
import { CreateMapCreditDto } from './map-credit.dto';
import { ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { UserDto } from '../user/user.dto';
import { Exclude } from 'class-transformer';
import { MapSubmissionVersionDto } from './map-submission-version.dto';

export class PlaceholderSuggestionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  alias: string;

  @EnumProperty(MapCreditType)
  type: MapCreditType;
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
  readonly placeholders: PlaceholderSuggestionDto[];

  @NestedProperty(UserDto)
  readonly submitter?: UserDto;

  @IdProperty()
  readonly submitterID: number;

  @Exclude()
  readonly mapID: number;

  @NestedProperty(MapSubmissionVersionDto, { required: true })
  readonly currentVersion: MapSubmissionVersionDto;

  @IdProperty()
  readonly currentVersionID: string;

  @NestedProperty(MapSubmissionVersionDto, { required: true, isArray: true })
  readonly versions: MapSubmissionVersionDto[];

  @NestedProperty(CreateMapInfoDto, { required: true })
  readonly info: CreateMapInfoDto;

  @NestedProperty(CreateMapCreditDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  readonly credits: CreateMapCreditDto[];
}

import {
  CreateMap,
  CreateMapWithFiles,
  DateString,
  MapStatus,
  MapSubmissionType,
  MAX_MAP_NAME_LENGTH,
  MIN_MAP_NAME_LENGTH,
  MMap,
  UpdateMap
} from '@momentum/constants';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { UserDto } from '../user/user.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { IsMapName } from '../../validators';
import { LeaderboardDto } from '../run/leaderboard.dto';
import { LeaderboardRunDto } from '../run/leaderboard-run.dto';
import { MapImageDto } from './map-image.dto';
import { CreateMapInfoDto, MapInfoDto, UpdateMapInfoDto } from './map-info.dto';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapStatsDto } from './map-stats.dto';
import { MapSubmissionDto } from './map-submission.dto';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { MapSubmissionPlaceholderDto } from './map-submission-placeholder.dto';
import { MapZonesDto } from './map-zones.dto';
import { MapSubmissionApprovalDto } from './map-submission-approval.dto';
import { MapTestInviteDto } from './map-test-invite.dto';
import { MapVersionDto } from './map-version.dto';
import { MapReviewStatsDto } from './map-review-stats.dto';

export class MapDto implements MMap {
  @IdProperty()
  readonly id: number;

  @ApiProperty({
    type: String,
    description: 'The name of the map',
    example: 'arcane'
  })
  @IsMapName()
  @MinLength(MIN_MAP_NAME_LENGTH)
  @MaxLength(MAX_MAP_NAME_LENGTH)
  readonly name: string;

  @EnumProperty(MapStatus)
  readonly status: MapStatus;

  @IdProperty({ required: false })
  readonly submitterID: number;

  @NestedProperty(MapInfoDto)
  readonly info: MapInfoDto;

  @NestedProperty(UserDto, {
    lazy: true,
    description: 'The user the submitted the map'
  })
  readonly submitter: UserDto;

  @NestedProperty(MapSubmissionDto)
  readonly submission: MapSubmissionDto;

  @ApiProperty({
    description: 'Array of urls to map images',
    type: MapImageDto,
    isArray: true
  })
  @Transform(({ value }) =>
    // HACK: This is a stupid hack to get class-transformer to transform
    // correctly. It only works because my DtoFactory setup is ridiculous and
    // seems to transform TWICE. We're going to rework/replace CT/CV in future
    // anyway so leaving for now. UUUUGH
    value?.map((image) =>
      typeof image == 'string'
        ? { id: image }
        : plainToInstance(MapImageDto, image)
    )
  )
  readonly images: MapImageDto[];

  @ApiProperty({ description: 'Primary image for the map', type: MapImageDto })
  @Expose()
  get thumbnail(): MapImageDto {
    return plainToInstance(MapImageDto, this.images?.[0]);
  }

  @NestedProperty(MapStatsDto)
  readonly stats: MapStatsDto;

  @NestedProperty(MapVersionDto, { required: false })
  readonly currentVersion: MapVersionDto;

  @ApiProperty()
  @IsUUID()
  readonly currentVersionID: string;

  @NestedProperty(MapVersionDto, { required: false, isArray: true })
  readonly versions: MapVersionDto[];

  @NestedProperty(MapCreditDto, { isArray: true })
  readonly credits: MapCreditDto[];

  @NestedProperty(MapFavoriteDto, { isArray: true })
  readonly favorites: MapFavoriteDto[];

  @NestedProperty(LeaderboardDto, { isArray: true })
  readonly leaderboards: LeaderboardDto[];

  @NestedProperty(LeaderboardRunDto, { lazy: true, isArray: true })
  readonly worldRecords: LeaderboardRunDto[];

  @NestedProperty(LeaderboardRunDto, { lazy: true, isArray: true })
  readonly personalBests: LeaderboardRunDto[];

  @NestedProperty(MapTestInviteDto, { lazy: true, isArray: true })
  readonly testInvites?: MapTestInviteDto[];

  @NestedProperty(MapReviewStatsDto)
  readonly reviewStats?: MapReviewStatsDto;

  @CreatedAtProperty()
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}

export class CreateMapDto
  extends PickType(MapDto, ['name'] as const)
  implements CreateMap
{
  @EnumProperty(MapSubmissionType, {
    description:
      'Whether the submission is an original map, a port, or something unusual'
  })
  readonly submissionType: MapSubmissionType;

  @NestedProperty(MapSubmissionSuggestionDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  readonly suggestions: MapSubmissionSuggestionDto[];

  @ApiProperty({
    description: 'Whether the map should go into private testing'
  })
  @IsBoolean()
  readonly wantsPrivateTesting: boolean;

  @ApiProperty({
    description: 'Aliases for which new placeholder users should be made'
  })
  @NestedProperty(MapSubmissionPlaceholderDto, {
    description: 'Aliases for which new placeholder users should be made',
    isArray: true
  })
  @IsArray()
  @IsOptional()
  readonly placeholders: MapSubmissionPlaceholderDto[];

  @ApiProperty({
    description: 'Array of user IDs to invite to private testing',
    isArray: true
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  readonly testInvites?: number[];

  @NestedProperty(CreateMapInfoDto, { required: true })
  readonly info: CreateMapInfoDto;

  @NestedProperty(MapZonesDto, {
    required: true,
    description: 'The contents of the map zone file as JSON'
  })
  readonly zones: MapZonesDto;

  @NestedProperty(CreateMapCreditDto, { required: true, isArray: true })
  @IsArray()
  @IsOptional()
  readonly credits: CreateMapCreditDto[];

  @ApiProperty({
    type: String,
    description: 'Porting Changelog for the map',
    example: 'Initial release'
  })
  @ApiProperty({ description: 'Porting Changelog for the map' })
  @IsOptional()
  readonly portingChangelog: string;
}

export class CreateMapWithFilesDto implements CreateMapWithFiles {
  @ApiProperty({
    type: 'array',
    format: 'binary',
    description:
      'VMFs for the map. Usually a single file, but takes an array to allow instances.'
  })
  @IsOptional()
  readonly vmfs: any[];

  @NestedProperty(CreateMapDto, {
    description: 'The JSON part of the body'
  })
  readonly data: CreateMapDto;
}

export class UpdateMapDto
  extends PartialType(
    PickType(CreateMapDto, ['name', 'suggestions', 'portingChangelog'] as const)
  )
  implements UpdateMap
{
  @NestedProperty(MapSubmissionPlaceholderDto)
  readonly placeholders: MapSubmissionPlaceholderDto[];

  @NestedProperty(UpdateMapInfoDto)
  @IsOptional()
  readonly info: UpdateMapInfoDto;

  @EnumProperty(MapStatus)
  @IsOptional()
  readonly status: MapStatus;

  @EnumProperty(MapSubmissionType, {
    description:
      'Whether the submission is an original map, a port, or something unusual',
    required: false
  })
  readonly submissionType: MapSubmissionType;

  @IdProperty({
    required: false,
    description: 'UserID to update the submitter to'
  })
  readonly submitterID: number;

  @NestedProperty(MapSubmissionApprovalDto, { required: false, isArray: true })
  @ArrayMinSize(1)
  @IsOptional()
  finalLeaderboards?: MapSubmissionApprovalDto[];
}

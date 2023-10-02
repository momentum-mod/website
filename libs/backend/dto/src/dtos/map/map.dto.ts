import {
  approvedBspPath,
  approvedVmfsPath,
  CreateMap,
  CreateMapWithFiles,
  Gamemode,
  MapStatusNew,
  MapSubmissionType,
  MMap
} from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsHash,
  IsInt,
  IsLowercase,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl
} from 'class-validator';
import { CreateMapInfoDto, MapInfoDto, UpdateMapInfoDto } from './map-info.dto';
import {
  CreateMapTrackDto,
  MapTrackDto,
  UpdateMapTrackDto
} from './map-track.dto';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './map-library-entry';
import { RankDto } from '../run/rank.dto';
import { Exclude, Expose } from 'class-transformer';
import { Config } from '@momentum/backend/config';
import { MapStatsDto } from './map-stats.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { IsMapName } from '@momentum/backend/validators';
import { MapSubmissionDto } from './map-submission.dto';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';
import { MapSubmissionPlaceholderDto } from './map-submission-placeholder.dto';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class MapDto implements MMap {
  @IdProperty()
  readonly id: number;

  @ApiProperty({
    type: String,
    description:
      'The name of the map, without gamemode prefix and any extra embellishments e.g. "_final"',
    example: 'arcane'
  })
  @IsLowercase()
  readonly name: string;

  @ApiProperty({
    type: String,
    description: 'The full filename of the map',
    example: 'bhop_arcane'
  })
  @IsMapName()
  readonly fileName: string;

  @EnumProperty(Gamemode)
  readonly type: Gamemode;

  @EnumProperty(MapStatusNew)
  readonly status: MapStatusNew;

  @ApiProperty({ type: String, description: 'URL to BSP in storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    return this.status === MapStatusNew.APPROVED
      ? `${ENDPOINT_URL}/${BUCKET}/${approvedBspPath(this.fileName)}`
      : undefined;
  }

  @ApiProperty({ description: 'SHA1 hash of the BSP file', type: String })
  @IsHash('sha1')
  @IsOptional()
  readonly hash: string;

  @ApiProperty({ type: String, description: 'URL to VMF in storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get vmfDownloadURL() {
    return this.status === MapStatusNew.APPROVED && this.hasVmf
      ? `${ENDPOINT_URL}/${BUCKET}/${approvedVmfsPath(this.fileName)}`
      : undefined;
  }

  @Exclude()
  readonly hasVmf: boolean;

  @Exclude()
  readonly thumbnailID: number;

  @NestedProperty(MapImageDto)
  readonly thumbnail: MapImageDto;

  @ApiProperty()
  @IsPositive()
  @IsOptional()
  readonly submitterID: number;

  @Exclude()
  readonly mainTrackID: number;

  @NestedProperty(MapTrackDto)
  readonly mainTrack: MapTrackDto;

  @NestedProperty(MapInfoDto)
  readonly info: MapInfoDto;

  @NestedProperty(UserDto, {
    lazy: true,
    description: 'The user the submitted the map'
  })
  readonly submitter: UserDto;

  @NestedProperty(MapSubmissionDto)
  readonly submission: MapSubmissionDto;

  @NestedProperty(MapImageDto, { isArray: true })
  readonly images: MapImageDto[];

  @NestedProperty(MapTrackDto, { isArray: true })
  readonly tracks: MapTrackDto[];

  @NestedProperty(MapStatsDto)
  readonly stats: MapStatsDto;

  @NestedProperty(MapCreditDto, { isArray: true })
  readonly credits: MapCreditDto[];

  @NestedProperty(MapFavoriteDto, { isArray: true })
  readonly favorites: MapFavoriteDto[];

  @NestedProperty(MapLibraryEntryDto, { isArray: true })
  readonly libraryEntries: MapLibraryEntryDto[];

  @NestedProperty(RankDto, { lazy: true })
  readonly worldRecord: RankDto;

  @NestedProperty(RankDto, { lazy: true })
  readonly personalBest: RankDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateMapDto
  extends PickType(MapDto, ['name', 'fileName'] as const)
  implements CreateMap
{
  @EnumProperty(MapSubmissionType, {
    description:
      'Whether the submission is an original map, a port, or something unusual'
  })
  readonly submissionType: MapSubmissionType;

  @NestedProperty(MapSubmissionSuggestionDto, { isArray: true })
  @IsArray()
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
  readonly placeholders: MapSubmissionPlaceholderDto[];

  @ApiProperty({
    description: 'Array of user IDs to invite to private testing',
    isArray: true
  })
  @IsArray()
  @IsInt({ each: true })
  readonly testInvites?: number[];

  @NestedProperty(CreateMapInfoDto, { required: true })
  readonly info: CreateMapInfoDto;

  @NestedProperty(CreateMapTrackDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  readonly tracks: CreateMapTrackDto[];

  @NestedProperty(CreateMapCreditDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  readonly credits: CreateMapCreditDto[];
}

export class CreateMapWithFilesDto implements CreateMapWithFiles {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'BSP for the map. MUST be run through bspzip!'
  })
  @IsDefined()
  readonly bsp: any;

  @ApiProperty({
    type: 'string',
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

export class UpdateMapDto extends PartialType(
  PickType(CreateMapDto, ['name', 'fileName', 'suggestions'] as const)
) {
  @NestedProperty(UpdatePlaceholderSuggestionDto, { required: true })
  readonly placeholders: UpdatePlaceholderSuggestionDto[];

  @NestedProperty(UpdateMapInfoDto)
  @IsOptional()
  readonly info: UpdateMapInfoDto;

  @NestedProperty(CreateMapTrackDto, { isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsOptional()
  readonly tracks: UpdateMapTrackDto[];

  @EnumProperty(MapStatusNew)
  @IsOptional()
  readonly status: MapStatusNew;
}

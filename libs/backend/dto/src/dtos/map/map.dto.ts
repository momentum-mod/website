import {
  approvedBspPath,
  approvedVmfsPath,
  CreateMap,
  Gamemode,
  MapStatus,
  MapSubmissionType,
  MMap
} from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsHash,
  IsInt,
  IsLowercase,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl
} from 'class-validator';
import { CreateMapInfoDto, MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
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
import {
  MapSubmissionDto,
  PlaceholderSuggestionDto
} from './map-submission.dto';
import { MapSubmissionSuggestionDto } from './map-submission-suggestion.dto';

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

  @EnumProperty(MapStatus)
  readonly status: MapStatus;

  @ApiProperty({ type: String, description: 'URL to BSP in storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    return `${ENDPOINT_URL}/${BUCKET}/${approvedBspPath(this.fileName)}`;
  }

  @ApiProperty({ description: 'SHA1 hash of the map file', type: String })
  @IsHash('sha1')
  @IsOptional()
  readonly hash: string;

  @ApiProperty({ type: String, description: 'URL to VMF in cloud storage' })
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
  @ApiProperty({
    description:
      'Whether the submission is an original map, a port, or something unusual'
  })
  submissionType: MapSubmissionType;

  @NestedProperty(MapSubmissionSuggestionDto)
  suggestions: MapSubmissionSuggestionDto[];

  @ApiProperty({
    description: 'Whether the map should go into private testing'
  })
  wantsPrivateTesting: boolean;

  @ApiProperty({
    description: 'Aliases for which new placeholder users should be made'
  })
  placeholders: PlaceholderSuggestionDto[];

  @ApiProperty({
    description: 'Array of user IDs to invite to private testing',
    isArray: true
  })
  @IsArray()
  @IsInt({ each: true })
  testInvites?: number[];

  @NestedProperty(UserDto)
  submitter?: UserDto;

  @IdProperty()
  submitterID: number;

  @NestedProperty(CreateMapInfoDto, { required: true })
  info: CreateMapInfoDto;

  @NestedProperty(CreateMapTrackDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  tracks: CreateMapTrackDto[];

  @NestedProperty(CreateMapCreditDto, { required: true, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  credits: CreateMapCreditDto[];
}

// TODO: Shit
export class UpdateMapDto extends PickType(MapDto, ['status'] as const) {}

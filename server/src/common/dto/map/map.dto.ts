import { Map as MapDB } from '@prisma/client';
import { MapStatus, MapType } from '../../enums/map.enum';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsDefined,
    IsEnum,
    IsHash,
    IsInt,
    IsOptional,
    IsString,
    IsUrl
} from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { CreateMapInfoDto, MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
import { IsMapName } from '../../validators/is-map-name.validator';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './map-library-entry';
import { MapRankDto } from './map-rank.dto';
import { Exclude, Expose } from 'class-transformer';
import { Config } from '@config/config';

export class MapDto implements MapDB {
    @ApiProperty()
    @IsDefined()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsMapName()
    name: string;

    @ApiProperty()
    @IsEnum(MapType)
    type: MapType;

    @ApiProperty()
    @IsEnum(MapStatus)
    statusFlag: MapStatus;

    @Exclude()
    fileKey: string;

    @Expose()
    @IsOptional()
    @IsString()
    @IsUrl({ require_tld: false })
    get downloadURL() {
        return `${Config.url.cdn}/${Config.storage.bucketName}/${this.fileKey}`;
    }

    @ApiProperty()
    @IsOptional()
    @IsHash('sha1')
    hash: string;

    @ApiProperty()
    thumbnailID: number;

    @NestedDto(MapImageDto)
    thumbnail: MapImageDto;

    @ApiProperty()
    @IsOptional()
    @IsInt()
    submitterID: number;

    @Exclude()
    mainTrackID: number;

    @NestedDto(MapTrackDto, { required: false })
    mainTrack?: MapTrackDto;

    @NestedDto(MapInfoDto, { required: false })
    info?: MapInfoDto;

    @NestedDto(UserDto, {
        type: () => UserDto,
        description: 'The user the submitted the map'
    })
    submitter: UserDto;

    @NestedDto(MapImageDto, { required: false, isArray: true })
    images?: MapImageDto[];

    @NestedDto(MapTrackDto, { required: false, isArray: true })
    tracks?: MapTrackDto[];

    @NestedDto(BaseStatsDto)
    stats: BaseStatsDto;

    @NestedDto(MapCreditDto)
    credits: MapCreditDto[];

    @NestedDto(MapFavoriteDto)
    favorites: MapFavoriteDto[];

    @NestedDto(MapLibraryEntryDto, { required: false, isArray: true })
    libraryEntries?: MapLibraryEntryDto[];

    @NestedDto(MapRankDto, { type: () => MapRankDto, required: false })
    worldRecord?: MapRankDto;

    @NestedDto(MapRankDto, { type: () => MapRankDto, required: false })
    personalBest?: MapRankDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class UpdateMapDto extends PickType(MapDto, ['statusFlag'] as const) {}

export class CreateMapDto extends PickType(MapDto, ['name', 'type'] as const) {
    @NestedDto(CreateMapInfoDto)
    info: CreateMapInfoDto;

    @NestedDto(CreateMapTrackDto, { isArray: true })
    @IsArray()
    @ArrayMinSize(1)
    tracks: CreateMapTrackDto[];

    @NestedDto(CreateMapCreditDto, { isArray: true })
    @IsArray()
    @ArrayMinSize(1)
    credits: CreateMapCreditDto[];
}

import { Map as MapDB } from '@prisma/client';
import { MapStatus, MapType } from '../../enums/map.enum';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsEnum,
    IsHash,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl
} from 'class-validator';
import { NestedDto, NestedDtoOptional } from '@lib/dto.lib';
import { CreateMapInfoDto, MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
import { IsMapName } from '../../validators/is-map-name.validator';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './map-library-entry';
import { MapRankDto } from './map-rank.dto';
import { Exclude, Expose } from 'class-transformer';
import { Config } from '@config/config';
import { MapStatsDto } from '@common/dto/map/map-stats.dto';

export class MapDto implements MapDB {
    @IdProperty()
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
    @IsHash('sha1')
    @IsOptional()
    hash: string;

    @ApiProperty()
    @IsPositive()
    @IsOptional()
    thumbnailID: number;

    @NestedDtoOptional(MapImageDto)
    thumbnail: MapImageDto;

    @ApiProperty()
    @IsPositive()
    @IsOptional()
    submitterID: number;

    @Exclude()
    mainTrackID: number;

    @NestedDtoOptional(MapTrackDto, { required: false })
    mainTrack?: MapTrackDto;

    @NestedDtoOptional(MapInfoDto, { required: false })
    info?: MapInfoDto;

    @NestedDtoOptional(UserDto, {
        type: () => UserDto,
        description: 'The user the submitted the map'
    })
    submitter: UserDto;

    @NestedDtoOptional(MapImageDto, { required: false, isArray: true })
    images?: MapImageDto[];

    @NestedDtoOptional(MapTrackDto, { required: false, isArray: true })
    tracks?: MapTrackDto[];

    @NestedDtoOptional(MapStatsDto)
    stats: MapStatsDto;

    @NestedDtoOptional(MapCreditDto)
    credits: MapCreditDto[];

    @NestedDtoOptional(MapFavoriteDto)
    favorites: MapFavoriteDto[];

    @NestedDtoOptional(MapLibraryEntryDto, { required: false, isArray: true })
    libraryEntries?: MapLibraryEntryDto[];

    @NestedDtoOptional(MapRankDto, { type: () => MapRankDto, required: false })
    worldRecord?: MapRankDto;

    @NestedDtoOptional(MapRankDto, { type: () => MapRankDto, required: false })
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

import { Map as MapDB } from '@prisma/client';
import { MapStatus, MapType } from '../../enums/map.enum';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsHash, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';
import { CreatedAtProperty, IdProperty, NestedProperty, EnumProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { CreateMapInfoDto, MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
import { IsMapName } from '../../validators/is-map-name.validator';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './map-library-entry';
import { UserMapRankDto } from '../run/user-map-rank.dto';
import { Exclude, Expose } from 'class-transformer';
import { Config } from '@config/config';
import { MapStatsDto } from '@common/dto/map/map-stats.dto';

export class MapDto implements MapDB {
    @IdProperty()
    id: number;

    @ApiProperty({ type: String, example: 'bhop_arcane' })
    @IsMapName()
    name: string;

    @EnumProperty(MapType)
    type: MapType;

    @EnumProperty(MapStatus)
    statusFlag: MapStatus;

    @Exclude()
    fileKey: string;

    @ApiProperty({ type: String, description: 'URL to S3 storage' })
    @Expose()
    @IsOptional()
    @IsString()
    @IsUrl({ require_tld: false })
    get downloadURL() {
        return `${Config.url.cdn}/${Config.storage.bucketName}/${this.fileKey}`;
    }

    @ApiProperty({ description: 'SHA1 hash of the map file', type: String })
    @IsHash('sha1')
    @IsOptional()
    hash: string;

    @Exclude()
    thumbnailID: number;

    @NestedProperty(MapImageDto)
    thumbnail: MapImageDto;

    @ApiProperty()
    @IsPositive()
    @IsOptional()
    submitterID: number;

    @Exclude()
    mainTrackID: number;

    @NestedProperty(MapTrackDto)
    mainTrack: MapTrackDto;

    @NestedProperty(MapInfoDto)
    info: MapInfoDto;

    @NestedProperty(UserDto, { lazy: true, description: 'The user the submitted the map' })
    submitter: UserDto;

    @NestedProperty(MapImageDto, { isArray: true })
    images: MapImageDto[];

    @NestedProperty(MapTrackDto, { isArray: true })
    tracks: MapTrackDto[];

    @NestedProperty(MapStatsDto)
    stats: MapStatsDto;

    @NestedProperty(MapCreditDto)
    credits: MapCreditDto[];

    @NestedProperty(MapFavoriteDto)
    favorites: MapFavoriteDto[];

    @NestedProperty(MapLibraryEntryDto, { isArray: true })
    libraryEntries: MapLibraryEntryDto[];

    @NestedProperty(UserMapRankDto, { lazy: true })
    worldRecord: UserMapRankDto;

    @NestedProperty(UserMapRankDto, { lazy: true })
    personalBest: UserMapRankDto;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

export class UpdateMapDto extends PickType(MapDto, ['statusFlag'] as const) {}

export class CreateMapDto extends PickType(MapDto, ['name', 'type'] as const) {
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

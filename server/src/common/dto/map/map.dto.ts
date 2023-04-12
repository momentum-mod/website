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
    readonly id: number;

    @ApiProperty({ type: String, example: 'bhop_arcane' })
    @IsMapName()
    readonly name: string;

    @EnumProperty(MapType)
    readonly type: MapType;

    @EnumProperty(MapStatus)
    readonly status: MapStatus;

    @Exclude()
    readonly fileKey: string;

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
    readonly hash: string;

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

    @NestedProperty(UserDto, { lazy: true, description: 'The user the submitted the map' })
    readonly submitter: UserDto;

    @NestedProperty(MapImageDto, { isArray: true })
    readonly images: MapImageDto[];

    @NestedProperty(MapTrackDto, { isArray: true })
    readonly tracks: MapTrackDto[];

    @NestedProperty(MapStatsDto)
    readonly stats: MapStatsDto;

    @NestedProperty(MapCreditDto)
    readonly credits: MapCreditDto[];

    @NestedProperty(MapFavoriteDto)
    readonly favorites: MapFavoriteDto[];

    @NestedProperty(MapLibraryEntryDto, { isArray: true })
    readonly libraryEntries: MapLibraryEntryDto[];

    @NestedProperty(UserMapRankDto, { lazy: true })
    readonly worldRecord: UserMapRankDto;

    @NestedProperty(UserMapRankDto, { lazy: true })
    readonly personalBest: UserMapRankDto;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

export class UpdateMapDto extends PickType(MapDto, ['status'] as const) {}

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

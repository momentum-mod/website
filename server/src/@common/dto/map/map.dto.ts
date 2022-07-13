import { Map as MapDB, MapInfo } from '@prisma/client';
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
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested
} from 'class-validator';
import { DtoFactory } from '../../utils/dto.utility';
import { CreateMapInfoDto, MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
import { IsMapName } from '../../validators/is-map-name.validator';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './map-library-entry';
import { MapRankDto } from './map-rank.dto';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { appConfig } from '../../../../config/config';

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
    @IsUrl()
    get downloadURL() {
        return `${appConfig.baseURL_CDN}/${appConfig.storage.bucketName}/${this.fileKey}`;
    }

    @ApiProperty()
    @IsOptional()
    @IsString() // TODO: Could use IsHash?
    hash: string;

    @ApiProperty()
    thumbnailID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(MapImageDto, value))
    @ValidateNested()
    thumbnail: MapImageDto;

    @ApiProperty()
    @IsOptional()
    @IsInt()
    submitterID: number;

    @Exclude()
    mainTrackID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(MapTrackDto, value))
    @ValidateNested()
    mainTrack: MapTrackDto;

    @ApiProperty()
    // @Transform(({ value }) => DtoFactory(MapInfoDto, value))
    @ValidateNested()
    info?: MapInfoDto;

    @ApiProperty({ type: () => UserDto })
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    submitter?: UserDto;

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapImageDto, x)))
    @ValidateNested()
    images?: MapImageDto[];

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapTrackDto, x)))
    @ValidateNested()
    tracks: MapTrackDto[];

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(BaseStatsDto, value))
    @ValidateNested()
    stats: BaseStatsDto;

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapCreditDto, x)))
    @ValidateNested()
    credits: MapCreditDto[];

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapFavoriteDto, x)))
    @ValidateNested()
    favorites: MapFavoriteDto[];

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapLibraryEntryDto, x)))
    @ValidateNested()
    libraryEntries?: MapLibraryEntryDto[];

    @ApiProperty({ type: () => MapRankDto })
    @Transform(({ value }) => DtoFactory(MapRankDto, value))
    @ValidateNested()
    worldRecord?: MapRankDto;

    @ApiProperty({ type: () => MapRankDto })
    @Transform(({ value }) => DtoFactory(MapRankDto, value))
    @ValidateNested()
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
    @ApiProperty()
    @Type()
    @ValidateNested()
    info: CreateMapInfoDto;

    @ApiProperty()
    @Type(() => CreateMapTrackDto)
    @ValidateNested()
    @IsArray()
    @ArrayMinSize(1)
    tracks: CreateMapTrackDto[];

    @ApiProperty()
    @Type(() => CreateMapCreditDto)
    @ValidateNested()
    credits: CreateMapCreditDto[];
}

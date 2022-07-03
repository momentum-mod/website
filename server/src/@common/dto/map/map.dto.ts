import { Map as MapDB } from '@prisma/client';
import { MapStatus, MapType } from '../../enums/map.enum';
import { UserDto } from '../user/user.dto';
import { MapImageDto } from './map-image.dto';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsEnum, IsInt, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { DtoFactory } from '../../utils/dto.utility';
import { MapInfoDto } from './map-info.dto';
import { CreateMapTrackDto, MapTrackDto } from './map-track.dto';
import { IsMapName } from '../../validators/is-map-name.validator';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { CreateMapCreditDto, MapCreditDto } from './map-credit.dto';
import { MapFavoriteDto } from './map-favorite.dto';
import { MapLibraryEntryDto } from './library-entry';
import { MapRankDto } from './map-rank.dto';
import { Transform } from 'class-transformer';

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

    // TODO: Im not sure what should be optional in these next couple props
    @ApiProperty()
    @IsOptional()
    @IsString()
    @IsUrl()
    downloadURL: string;

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

    // maybe we'll wanna exclude this, guessing its probs useful tho
    @ApiProperty()
    @IsInt()
    submitterID: number;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(MapInfoDto, value))
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
    @Transform(({ value }) => DtoFactory(MapFavoriteDto, value))
    @ValidateNested()
    favorites: MapFavoriteDto;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(MapLibraryEntryDto, value))
    @ValidateNested()
    libraryEntries?: MapLibraryEntryDto;

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

export class CreateMapDto extends IntersectionType(
    PickType(MapDto, ['name', 'type'] as const),
    PickType(MapInfoDto, ['description', 'youtubeID', 'numTracks', 'creationDate'] as const)
) {
    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(CreateMapTrackDto, x)))
    @ValidateNested()
    tracks: CreateMapTrackDto[];

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(CreateMapCreditDto, x)))
    @ValidateNested()
    credits: CreateMapCreditDto[];

    // Old api has basestats here as well but idk why
}

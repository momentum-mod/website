import { MapInfo } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class MapInfoDto implements MapInfo {
    @IdProperty()
    id: number;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsOptional()
    @Matches(/^[\w-]{11}$/)
    youtubeID: string;

    @ApiProperty()
    @IsPositive()
    numTracks: number;

    @ApiProperty()
    @IsDateString()
    creationDate: Date;

    @Exclude()
    mapID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class CreateMapInfoDto extends PickType(MapInfoDto, [
    'description',
    'youtubeID',
    'numTracks',
    'creationDate'
] as const) {}

export class UpdateMapInfoDto extends PartialType(
    PickType(MapInfoDto, ['description', 'youtubeID', 'creationDate'] as const)
) {}

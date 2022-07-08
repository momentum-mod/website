import { MapInfo } from '@prisma/client';
import { Exclude, Transform, Type } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsDate, IsDateString, IsDefined, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class MapInfoDto implements MapInfo {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsDefined()
    @IsString()
    description: string;

    @ApiProperty()
    @IsOptional()
    @Matches(/^[\w_-]{11}$/)
    youtubeID: string;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    numTracks: number;

    @ApiProperty()
    @IsDefined()
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

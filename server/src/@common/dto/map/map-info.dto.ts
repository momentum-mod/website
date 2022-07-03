import { MapInfo } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUrl } from 'class-validator';

export class MapInfoDto implements MapInfo {
    @Exclude()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    // TODO: youtube url validator (some regex idk)
    //@IsUrl()
    youtubeID: string;

    @ApiProperty()
    @IsOptional()
    @IsInt()
    numTracks: number;
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

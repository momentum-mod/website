import { MapInfo } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class MapInfoDto implements MapInfo {
    @IdProperty()
    id: number;

    @ApiProperty({ type: String, description: 'Author-submitted description of the map' })
    @IsString()
    description: string;

    @ApiProperty({
        type: String,
        description: 'ID of Youtube video for the map, for use with e.g. https://www.youtube.com/?v=[ID]'
    })
    @IsOptional()
    @Matches(/^[\w-_]{11}$/)
    youtubeID: string;

    @ApiProperty()
    @IsPositive()
    numTracks: number;

    @ApiProperty()
    @IsDateString()
    creationDate: Date;

    @Exclude()
    mapID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
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

import { MapImage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUrl } from 'class-validator';

export class MapImageDto implements MapImage {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsUrl()
    small: string;

    @ApiProperty()
    @IsUrl()
    medium: string;

    @ApiProperty()
    @IsUrl()
    large: string;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

import { MapImage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive, IsUrl } from 'class-validator';
import { Exclude } from 'class-transformer';

export class MapImageDto implements MapImage {
    @ApiProperty()
    @IsPositive()
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

    @Exclude()
    mapID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

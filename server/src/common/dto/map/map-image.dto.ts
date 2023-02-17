import { MapImage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive, IsUrl } from 'class-validator';
import { Exclude } from 'class-transformer';

export class MapImageDto implements MapImage {
    @IdProperty()
    id: number;

    // TODO: Specify exact resolutions
    @ApiProperty({ type: String, description: 'URL to low resolution image file' })
    @IsUrl()
    small: string;

    @ApiProperty({ type: String, description: 'URL to medium resolution image file' })
    @IsUrl()
    medium: string;

    @ApiProperty({ type: String, description: 'URL to high resolution image file' })
    @IsUrl()
    large: string;

    @Exclude()
    mapID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

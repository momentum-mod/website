import { MapImage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { CreatedAtProperty, IdProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { Config } from '@config/config';

export class MapImageDto implements MapImage {
    @IdProperty()
    id: number;

    @ApiProperty({ type: String, description: 'URL to low resolution (480x360) JPEG image file' })
    @Expose()
    @IsUrl({ require_tld: false })
    get small(): string {
        return `${Config.url.cdn}/${Config.storage.bucketName}/${this.id}-small.jpg`;
    }

    @ApiProperty({ type: String, description: 'URL to medium resolution (1280x720) JPEG image file' })
    @Expose()
    @IsUrl({ require_tld: false })
    get medium(): string {
        return `${Config.url.cdn}/${Config.storage.bucketName}/${this.id}-medium.jpg`;
    }

    @ApiProperty({ type: String, description: 'URL to high resolution (1920x1080) JPEG image file' })
    @Expose()
    @IsUrl({ require_tld: false })
    get large(): string {
        return `${Config.url.cdn}/${Config.storage.bucketName}/${this.id}-large.jpg`;
    }

    @Exclude()
    mapID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

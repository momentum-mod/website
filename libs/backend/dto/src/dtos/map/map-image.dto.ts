import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { Expose } from 'class-transformer';
import { Config } from '@momentum/backend/config';
import {
  CreatedAtProperty,
  IdProperty,
  UpdatedAtProperty
} from '../../decorators';
import { MapImage } from '@momentum/constants';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class MapImageDto implements MapImage {
  @IdProperty()
  readonly id: number;

  @IdProperty()
  readonly mapID: number;

  @ApiProperty({
    type: String,
    description: 'URL to low resolution (480x360) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get small(): string {
    return `${ENDPOINT_URL}/${BUCKET}/img/${this.id}-small.jpg`;
  }

  @ApiProperty({
    type: String,
    description: 'URL to medium resolution (1280x720) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get medium(): string {
    return `${ENDPOINT_URL}/${BUCKET}/img/${this.id}-medium.jpg`;
  }

  @ApiProperty({
    type: String,
    description: 'URL to high resolution (1920x1080) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get large(): string {
    return `${ENDPOINT_URL}/${BUCKET}/img/${this.id}-large.jpg`;
  }

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

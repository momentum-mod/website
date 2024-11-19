import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsString, IsUrl } from 'class-validator';
import { Expose } from 'class-transformer';
import {
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath,
  MapImage,
  MAX_MAP_IMAGES,
  UpdateMapImages
} from '@momentum/constants';
import { Config } from '../../config';
import { StringIdProperty } from '../decorators';

const CDN_URL = Config.url.cdn;

export class MapImageDto implements MapImage {
  @StringIdProperty({ uuid: true })
  readonly id: string;

  @ApiProperty({
    type: String,
    description: 'URL to low resolution (480x360) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get small(): string {
    return `${CDN_URL}/${imgSmallPath(this.id)}`;
  }

  @ApiProperty({
    type: String,
    description: 'URL to medium resolution (1280x720) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get medium(): string {
    return `${CDN_URL}/${imgMediumPath(this.id)}`;
  }

  @ApiProperty({
    type: String,
    description: 'URL to high resolution (1920x1080) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get large(): string {
    return `${CDN_URL}/${imgLargePath(this.id)}`;
  }

  @ApiProperty({
    type: String,
    description: 'URL to extra high resolution (2560x1440) JPEG image file'
  })
  @Expose()
  @IsUrl({ require_tld: false })
  get xl(): string {
    return `${CDN_URL}/${imgXlPath(this.id)}`;
  }
}

export class UpdateMapImagesDto implements UpdateMapImages {
  @ApiProperty({ description: 'See endpoint description', type: 'array' })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MAP_IMAGES)
  @IsString({ each: true })
  imageIDs: string[];
}

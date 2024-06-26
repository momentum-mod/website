import { MapPreSignedUrl } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class MapPreSignedUrlDto implements MapPreSignedUrl {
  @ApiProperty()
  @IsUrl()
  readonly url: string;
}

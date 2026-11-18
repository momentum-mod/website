import { RunDownloadUrl } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class RunDownloadUrlDto implements RunDownloadUrl {
  @ApiProperty({
    description: 'Short-lived pre-signed URL to download the replay file'
  })
  @IsUrl({ require_tld: false })
  readonly url: string;
}

import { FlatMapList, mapListPath, MapListVersion } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Expose } from 'class-transformer';
import { Config } from '../../config';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class MapListVersionDto implements MapListVersion {
  @ApiProperty({ description: 'Latest version of the main map list' })
  @IsInt()
  approved: number;

  @ApiProperty({
    description: 'URL to the latest version of the main map list in file store'
  })
  @Expose()
  get approvedURL(): string {
    return `${ENDPOINT_URL}/${BUCKET}/${mapListPath(
      FlatMapList.APPROVED,
      this.approved
    )}`;
  }

  @ApiProperty({ description: 'Latest version of the submission map list' })
  @IsInt()
  submissions: number;

  @ApiProperty({
    description:
      'URL to the latest version of the submission map list in file store'
  })
  @Expose()
  get submissionsURL(): string {
    return `${ENDPOINT_URL}/${BUCKET}/${mapListPath(
      FlatMapList.SUBMISSION,
      this.submissions
    )}`;
  }
}

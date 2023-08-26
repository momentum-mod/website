import { ApiProperty } from '@nestjs/swagger';
import {
  CreateMapSubmissionVersion,
  MapSubmissionVersion
} from '@momentum/constants';
import {
  IsHash,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID
} from 'class-validator';
import { MapSubmissionDto } from './map-submission.dto';
import { Exclude, Expose } from 'class-transformer';
import { CreatedAtProperty } from '../../decorators';
import { Config } from '@momentum/backend/config';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class MapSubmissionVersionDto implements MapSubmissionVersion {
  @ApiProperty()
  @IsUUID()
  readonly id: string;

  @ApiProperty()
  @IsInt()
  readonly versionNum: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly changelog: string;

  @Exclude()
  readonly submission: MapSubmissionDto;

  @Exclude()
  readonly submissionID: number;

  @ApiProperty({ type: String, description: 'URL to BSP in cloud storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    // We store BSPs relative to their UUID and don't expose maps to submission
    // to users that don't have permission (see MapsService.getMapAndCheckReadAccces)
    // so this is a reasonably secure way to keep maps hidden from most users.
    return `${ENDPOINT_URL}/${BUCKET}/submissions/${this.id}.bsp`;
  }

  @ApiProperty({ description: 'SHA1 hash of the BSP file', type: String })
  @IsHash('sha1')
  @IsOptional()
  readonly hash: string;

  @ApiProperty({ type: String, description: 'URL to VMF in cloud storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get vmfDownloadURL() {
    return this.hasVmf
      ? `${ENDPOINT_URL}/${BUCKET}/submissions/${this.id}_VMFs.zip`
      : undefined;
  }

  @Exclude()
  readonly hasVmf: boolean;

  @CreatedAtProperty()
  readonly createdAt: Date;
}

export class CreateMapSubmissionVersionDto
  implements CreateMapSubmissionVersion
{
  @ApiProperty()
  @IsString()
  readonly changelog: string;
}

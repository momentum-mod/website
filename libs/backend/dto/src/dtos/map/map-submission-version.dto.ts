import { ApiProperty } from '@nestjs/swagger';
import { MapSubmissionVersion } from '@momentum/constants';
import { IsInt, IsString, IsUUID } from 'class-validator';
import { MapSubmissionDto } from './map-submission.dto';
import { Exclude } from 'class-transformer';
import { CreatedAtProperty } from '../../decorators';

export class MapSubmissionVersionDto implements MapSubmissionVersion {
  @ApiProperty()
  @IsUUID()
  readonly id: string;

  @ApiProperty()
  @IsInt()
  readonly versionNum: number;

  @ApiProperty()
  @IsString()
  readonly changelog: string;

  @Exclude()
  readonly submission: MapSubmissionDto;

  @Exclude()
  readonly submissionID: number;

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

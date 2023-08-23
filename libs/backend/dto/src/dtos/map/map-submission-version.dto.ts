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

  @CreatedAtProperty()
  readonly createdAt: Date;
}

import {
  DateString,
  MapStatus,
  MapSubmission,
  MapSubmissionDate,
  User
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumProperty, IdProperty, NestedProperty } from '../decorators';
import { UserDto } from '../user/user.dto';
import { MapSubmissionDto } from './map-submission.dto';

export class MapSubmissionDateDto implements MapSubmissionDate {
  @IdProperty()
  readonly id: number;

  @EnumProperty(MapStatus)
  readonly status: MapStatus;

  @ApiProperty({ description: 'Date the map was submitted' })
  @IsDate()
  @Transform(({ value }) => new Date(value)) // TODO: Can't remember why I added this transform. Pointless?
  readonly date: DateString;

  @IdProperty()
  readonly userID: number | null;

  @NestedProperty(UserDto, {
    lazy: true,
    description: `User that caused date to be created,
      e.g. original submitter or admin`
  })
  readonly user: User | null;

  @IdProperty()
  readonly submissionMapID: number;

  @NestedProperty(MapSubmissionDto, { lazy: true })
  readonly submission: MapSubmission;
}

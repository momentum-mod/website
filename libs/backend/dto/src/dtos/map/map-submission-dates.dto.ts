import {
  DateString,
  MapStatusNew,
  MapSubmissionDate
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnumProperty } from '../../decorators';

export class MapSubmissionDateDto implements MapSubmissionDate {
  @EnumProperty(MapStatusNew)
  readonly status: MapStatusNew;

  @ApiProperty({ description: 'Date the map was submitted' })
  @IsDate()
  @Transform(({ value }) => new Date(value)) // TODO: Can't remember why I added this transform. Pointless?
  readonly date: DateString;
}

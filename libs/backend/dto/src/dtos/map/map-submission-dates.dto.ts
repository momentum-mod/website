import { DateString, MapSubmissionDates } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class MapSubmissionDatesDto implements MapSubmissionDates {
  [k: string]: string;

  @ApiProperty({ description: 'Date the map was submitted' })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  readonly submitted: DateString;

  @ApiProperty({ description: 'Date the map entered Content Approval' })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  readonly contentApproval: DateString;

  @ApiProperty({ description: 'Date the map entered Final Approval' })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  readonly finalApproval: DateString;

  @ApiProperty({ description: 'Date the map entered Public Testing' })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  readonly publicTesting: DateString;

  @ApiProperty({ description: 'Date the map was approved' })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  readonly approved: DateString;
}

﻿import { DateString, RunSessionTimestamp } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber } from 'class-validator';
import { CreatedAtProperty, IdProperty } from '../decorators';

export class RunSessionTimestampDto implements RunSessionTimestamp {
  @IdProperty({ bigint: true })
  readonly id: number;

  @ApiProperty()
  @IsInt()
  readonly majorNum: number;

  @ApiProperty()
  @IsInt()
  readonly minorNum: number;

  @ApiProperty()
  @IsNumber()
  readonly time: number;

  @IdProperty({ bigint: true })
  readonly sessionID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

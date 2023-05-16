import { RunSessionTimestamp } from '@momentum/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  UpdatedAtProperty
} from '../../decorators';

export class RunSessionTimestampDto
  implements RunSessionTimestamp
{
  @IdProperty({ bigint: true })
  readonly id: number;

  @ApiProperty()
  @IsInt()
  readonly zone: number;

  @ApiProperty()
  @IsInt()
  readonly tick: number;

  @IdProperty({ bigint: true })
  readonly sessionID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

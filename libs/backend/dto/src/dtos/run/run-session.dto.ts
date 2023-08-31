import { RunSession } from '@momentum/constants';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  UpdatedAtProperty
} from '../../decorators';

export class RunSessionDto implements RunSession {
  @IdProperty({ bigint: true })
  readonly id: number;

  @ApiProperty({
    description: 'The number of the track the run is on, 0 is main track',
    type: Number,
    required: true
  })
  @IsInt()
  readonly trackNum: number;

  @ApiProperty({
    description:
      'The zone the run is on. Non-zero will imply an IL run, which are not yet implemented',
    type: Number,
    required: true
  })
  @IsInt()
  readonly zoneNum: number;

  @ApiProperty({
    description: 'The ID of the user submitting the run',
    type: Number,
    required: true
  })
  @IsPositive()
  readonly userID: number;

  @ApiProperty({
    description: 'The ID of the MapTrack the run is on',
    type: Number,
    required: true
  })
  @IsPositive()
  readonly trackID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateRunSessionDto extends PickType(RunSessionDto, [
  'trackNum',
  'zoneNum' as const
]) {
  @ApiProperty({
    description: 'The map the run is on',
    type: Number,
    required: true
  })
  @IsPositive()
  readonly mapID: number;
}

export class UpdateRunSessionDto {
  @ApiProperty({
    description: 'The zone the run is on',
    type: Number,
    required: true
  })
  @IsInt()
  readonly zoneNum: number;

  @ApiProperty({
    description: 'The run tick at time of request',
    type: Number,
    required: true
  })
  @IsPositive()
  readonly tick: number;
}

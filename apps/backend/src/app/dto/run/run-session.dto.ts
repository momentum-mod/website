﻿import {
  CreateRunSession,
  DateString,
  Gamemode,
  RunSession,
  TrackType,
  UpdateRunSession
} from '@momentum/constants';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';
import { CreatedAtProperty, EnumProperty, IdProperty } from '../decorators';

export class RunSessionDto implements RunSession {
  @IdProperty({ bigint: true })
  readonly id: number;

  @ApiProperty({
    description: 'ID of the map the run is on',
    type: Number,
    required: true
  })
  @IsInt()
  readonly mapID: number;

  @EnumProperty(Gamemode, {
    description: 'Gamemode the run is on',
    required: true
  })
  readonly gamemode: Gamemode;

  @EnumProperty(TrackType, {
    description: 'The number of the track the run is on, relative to trackType',
    required: true
  })
  readonly trackType: TrackType;

  @ApiProperty({
    description: 'The number of the track the run is on, relative to trackType',
    type: Number,
    required: true
  })
  @IsInt()
  @Min(1)
  readonly trackNum: number;

  @ApiProperty({
    description: 'The ID of the user submitting the run',
    type: Number,
    required: true
  })
  @IsPositive()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

export class CreateRunSessionDto
  extends PickType(RunSessionDto, [
    'mapID',
    'gamemode',
    'trackType',
    'trackNum'
  ] as const)
  implements CreateRunSession {}

export class UpdateRunSessionDto implements UpdateRunSession {
  @IsInt()
  readonly majorNum: number;

  @IsInt()
  readonly minorNum: number;

  @IsPositive()
  readonly time: number;
}

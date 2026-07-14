import {
  CreateRunSession,
  DateString,
  Gamemode,
  RunSession,
  TrackType,
  UpdateRunSession
} from '@momentum/constants';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Min, Max } from 'class-validator';
import { CreatedAtProperty, EnumProperty, IdProperty } from '../decorators';
import { MAX_TRACK_SEGMENTS } from '@momentum/formats/zone';
import { RunSessionTimestampDto } from './run-session-timestamp.dto';

export class RunSessionDto implements RunSession {
  @IdProperty()
  readonly id: number;

  @IdProperty({
    description: 'ID of the map the run is on'
  })
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
  @Max(MAX_TRACK_SEGMENTS + 1)
  readonly trackNum: number;

  @IdProperty({
    description: 'The ID of the user submitting the run'
  })
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

/**
 * Body of the `runsession.create` message: identifies the leaderboard a new run
 * session is being started on.
 */
export class CreateRunSessionDto
  extends PickType(RunSessionDto, [
    'mapID',
    'gamemode',
    'trackType',
    'trackNum'
  ] as const)
  implements CreateRunSession {}

/**
 * Identifies an existing run session. Body of the `runsession.invalidate` and
 * `runsession.end` messages.
 */
export class RunSessionIdDto {
  @IdProperty({ description: 'The ID of the run session' })
  readonly sessionID: number;
}

/**
 * Body of the `runsession.update` message: a timestamp to append to an existing
 * run session.
 */
export class UpdateRunSessionDto
  extends RunSessionIdDto
  implements UpdateRunSession
{
  @IsInt()
  readonly majorNum: number;

  @IsInt()
  readonly minorNum: number;

  @IsPositive()
  readonly time: number;
}

/**
 * The subset of a timestamp echoed back in a `runsession.create` response - the
 * session's initial timestamp, before it's been persisted with an ID.
 */
export class RunSessionResponseTimestampDto extends PickType(
  RunSessionTimestampDto,
  ['majorNum', 'minorNum', 'time', 'createdAt'] as const
) {}

/**
 * Successful response to a `runsession.create` message: the created session plus
 * its initial timestamp.
 */
export class RunSessionResponseDto extends RunSessionDto {
  @ApiProperty({
    type: () => RunSessionResponseTimestampDto,
    isArray: true,
    description: 'Timestamps recorded for the session so far'
  })
  readonly timestamps: RunSessionResponseTimestampDto[];
}

/**
 * Payload returned in a `WsResponse` when a session operation fails.
 */
export class RunSessionErrorDto {
  @ApiProperty({ description: 'Description of why the operation failed' })
  @IsString()
  readonly error: string;
}

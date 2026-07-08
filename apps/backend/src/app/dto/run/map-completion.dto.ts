import { CompletionGroup, MapCompletion, TrackType } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { EnumProperty } from '../decorators';

/**
 * A single track's completion status for a user, as returned by
 * `GET maps/:mapID/user-completions`. See {@link MapCompletion}.
 */
export class MapCompletionDto implements MapCompletion {
  @EnumProperty(TrackType, {
    description: 'The type of track (main, stage or bonus)'
  })
  readonly trackType: TrackType;

  @ApiProperty({ type: Number, description: 'The track number' })
  @IsInt()
  @Min(1)
  readonly trackNum: number;

  @ApiProperty({
    type: Number,
    description: 'Total number of users who have completed this track'
  })
  @IsInt()
  readonly totalCompletions: number;

  @ApiProperty({
    type: Number,
    description: 'The user PB time (ticks * tickRate), null if not completed',
    nullable: true
  })
  @IsNumber()
  @IsOptional()
  readonly time: number | null;

  @ApiProperty({
    type: Number,
    description: "The user PB's rank, null if not completed",
    nullable: true
  })
  @IsInt()
  @IsOptional()
  readonly rank: number | null;

  @EnumProperty(CompletionGroup, {
    description:
      'The group the user PB falls into (WR/Top10/Group N), null if not completed',
    required: false,
    nullable: true
  })
  readonly group: CompletionGroup | null;
}

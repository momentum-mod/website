import { ApiPropertyOptional, OmitType, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import {
  BooleanQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty,
  SkipQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';

export class RunsGetAllQuery {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(10)
  take = 10;

  @ExpandQueryProperty([
    'overallStats',
    'map',
    'mapWithInfo',
    'rank',
    'zoneStats'
  ])
  readonly expand: string[];

  @IntQueryProperty({ description: 'Filter by map ID' })
  readonly mapID: number;

  @StringQueryProperty({ required: false, description: 'Filter by map name' })
  readonly mapName: string;

  // Not sure if these two are supposed to be user IDs or steam IDs. Going to assume userid for now,
  // if I'm wrong do steam ID handling like users/getall does.
  @IntQueryProperty({ description: 'Filter by user ID' })
  readonly userID: number;

  @IntCsvQueryProperty({ description: 'Filter by user IDs' })
  readonly userIDs: number[];

  @IntQueryProperty({
    description:
      'Filter by run flags (I dont really know what this is, I think a 0.10/0.11 thing -Tom)'
  })
  readonly flags: number;

  @BooleanQueryProperty({
    description: 'Whether or not to filter by only personal best runs.'
  })
  readonly isPB: boolean;

  @ApiPropertyOptional({
    name: 'order',
    enum: ['date', 'time'],
    type: String,
    description: 'Order by date or time'
  })
  @IsString()
  @IsOptional()
  readonly order: string;
}

export class MapsCtlRunsGetAllQuery extends OmitType(RunsGetAllQuery, [
  'mapID',
  'mapName'
] as const) {}

export class UserCtlRunsGetAllQuery extends PickType(RunsGetAllQuery, [
  'userID',
  'skip',
  'take'
] as const) {}

export class RunsGetQuery {
  @ExpandQueryProperty([
    'overallStats',
    'map',
    'mapWithInfo',
    'rank',
    'zoneStats'
  ])
  readonly expand: string[];
}

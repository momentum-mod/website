﻿import { RunsGetAllQuery, RunsGetQuery } from '@momentum/constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { QueryDto } from './query.dto';

export class RunsGetAllQueryDto extends QueryDto implements RunsGetAllQuery {
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
  expand?: string[];

  @IntQueryProperty({ description: 'Filter by map ID' })
  mapID?: number;

  @StringQueryProperty({ required: false, description: 'Filter by map name' })
  mapName?: string;

  @IntQueryProperty({ description: 'Filter by user ID' })
  userID?: number;

  @IntCsvQueryProperty({ description: 'Filter by user IDs' })
  userIDs?: number[];

  @IntQueryProperty({
    description:
      'Filter by run flags (I dont really know what this is, I think a 0.10/0.11 thing -Tom)'
  })
  flags?: number;

  @BooleanQueryProperty({
    description: 'Whether or not to filter by only personal best runs.'
  })
  isPB?: boolean;

  @ApiPropertyOptional({
    name: 'order',
    enum: ['date', 'time'],
    type: String,
    description: 'Order by date or time'
  })
  @IsString()
  @IsOptional()
  order?: string;
}

export class RunsGetQueryDto extends QueryDto implements RunsGetQuery {
  @ExpandQueryProperty([
    'overallStats',
    'map',
    'mapWithInfo',
    'rank',
    'zoneStats'
  ])
  readonly expand?: string[];
}

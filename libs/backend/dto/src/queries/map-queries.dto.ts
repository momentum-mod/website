import { MapStatus, MapType } from '@momentum/constants';
import {
  AdminCtlMapsGetAllQuery,
  MapCreditsGetQuery,
  MapRankGetNumberQuery,
  MapRanksGetQuery,
  MapsCtlGetAllQuery,
  MapsGetQuery
} from '@momentum/types';
import {
  BooleanQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty,
  SkipQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { PaginationQueryDto } from './pagination.dto';

class MapsGetAllBaseQuery {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(100)
  take = 100;

  @StringQueryProperty({
    description: 'Filter by partial map name match',
    example: 'de_dust2'
  })
  readonly search: string;

  @IntQueryProperty({ description: 'Filter by submitter ID' })
  readonly submitterID: number;
}

export class AdminCtlMapsGetAllQueryDto
  extends MapsGetAllBaseQuery
  implements AdminCtlMapsGetAllQuery
{
  @ExpandQueryProperty(['submitter', 'credits'])
  readonly expand: string[];

  @EnumQueryProperty(MapStatus, { description: 'Filter by map status flags' })
  readonly status: MapStatus;

  @BooleanQueryProperty({ description: 'Filter by priority or non-priority' })
  readonly priority: boolean;
}

export class MapsCtlGetAllQueryDto
  extends MapsGetAllBaseQuery
  implements MapsCtlGetAllQuery
{
  @ExpandQueryProperty([
    'submitter',
    'credits',
    'thumbnail',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord'
  ])
  readonly expand: string[];

  @EnumQueryProperty(MapType, { description: 'Filter by map type (gamemode)' })
  readonly type: MapType;

  @IntQueryProperty({ description: 'Filter by tier (lower bound)' })
  readonly difficultyLow: number;

  @IntQueryProperty({ description: 'Filter by tier (upper bound)' })
  readonly difficultyHigh: number;

  @BooleanQueryProperty({ description: 'Filter by linear or staged' })
  readonly isLinear: boolean;
}

export class MapsGetQueryDto implements MapsGetQuery {
  @ExpandQueryProperty([
    'info',
    'credits',
    'submitter',
    'images',
    'thumbnail',
    'stats',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord',
    'tracks'
  ])
  readonly expand: string[];
}

export class MapCreditsGetQueryDto implements MapCreditsGetQuery {
  @ExpandQueryProperty(['user'])
  readonly expand: string[];
}

export class MapRanksGetQueryDto
  extends PaginationQueryDto
  implements MapRanksGetQuery
{
  @IntQueryProperty({ description: 'Steam ID of player to get rank for' })
  readonly playerID: number;

  @IntCsvQueryProperty({
    description: 'CSV list of steam IDs of players to get rank for'
  })
  readonly playerIDs: number[];

  @IntQueryProperty({ description: 'Rank flags', default: 0 })
  readonly flags: number;

  @BooleanQueryProperty({
    description: 'Whether to order by date or not (false for reverse)'
  })
  readonly orderByDate: boolean;
}

export class MapRankGetNumberQueryDto implements MapRankGetNumberQuery {
  @IntQueryProperty({ description: 'Track number', default: 0 })
  readonly trackNum: number;

  @IntQueryProperty({ description: 'Zone number', default: 0 })
  readonly zoneNum: number;

  @IntQueryProperty({ description: 'Rank flags', default: 0 })
  readonly flags: number;
}

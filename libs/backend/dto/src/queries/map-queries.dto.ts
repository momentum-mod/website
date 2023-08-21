import {
  MapStatusNew,
  Gamemode,
  MapReviewsGetQuery,
  MapsGetAllExpand,
  MapReviewsGetExpand,
  MapCreditsGetExpand,
  MapsGetExpand,
  AdminMapsGetAllExpand
} from '@momentum/constants';
import {
  AdminMapsGetAllQuery,
  MapCreditsGetQuery,
  MapRankGetNumberQuery,
  MapRanksGetQuery,
  MapsGetAllQuery,
  MapsGetQuery
} from '@momentum/constants';
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
import { PagedQueryDto } from './pagination.dto';
import { QueryDto } from './query.dto';

export class AdminCtlMapsGetAllQueryDto implements AdminMapsGetAllQuery {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(100)
  take = 100;

  @StringQueryProperty({
    description: 'Filter by partial map name match',
    example: 'de_dust2'
  })
  readonly search?: string;

  @IntQueryProperty({ description: 'Filter by submitter ID' })
  readonly submitterID?: number;

  @ExpandQueryProperty(['submitter', 'credits'])
  readonly expand?: AdminMapsGetAllExpand;

  @EnumQueryProperty(MapStatusNew, {
    description: 'Filter by map status flags'
  })
  readonly status?: MapStatusNew;

  @BooleanQueryProperty({ description: 'Filter by priority or non-priority' })
  readonly priority?: boolean;
}

export class MapsCtlGetAllQueryDto implements MapsGetAllQuery {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(100)
  take = 100;

  @StringQueryProperty({
    description: 'Filter by partial map name match',
    example: 'de_dust2'
  })
  readonly search?: string;

  @IntQueryProperty({ description: 'Filter by submitter ID' })
  readonly submitterID?: number;

  @ExpandQueryProperty([
    'info',
    'credits',
    'submitter',
    'images',
    'thumbnail',
    'stats',
    'tracks',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord'
  ])
  readonly expand?: MapsGetAllExpand;

  @EnumQueryProperty(Gamemode, { description: 'Filter by map type (gamemode)' })
  readonly type?: Gamemode;

  @IntQueryProperty({ description: 'Filter by tier (lower bound)' })
  readonly difficultyLow?: number;

  @IntQueryProperty({ description: 'Filter by tier (upper bound)' })
  readonly difficultyHigh?: number;

  @BooleanQueryProperty({ description: 'Filter by linear or staged' })
  readonly isLinear?: boolean;
}

export class MapsGetQueryDto extends QueryDto implements MapsGetQuery {
  @ExpandQueryProperty([
    'info',
    'credits',
    'submitter',
    'images',
    'thumbnail',
    'stats',
    'tracks',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord'
  ])
  readonly expand?: MapsGetExpand;
}

export class MapCreditsGetQueryDto
  extends QueryDto
  implements MapCreditsGetQuery
{
  @ExpandQueryProperty(['user'])
  readonly expand?: MapCreditsGetExpand;
}

export class MapRanksGetQueryDto
  extends PagedQueryDto
  implements MapRanksGetQuery
{
  @IntQueryProperty({ description: 'Steam ID of player to get rank for' })
  readonly playerID?: number;

  @IntCsvQueryProperty({
    description: 'CSV list of steam IDs of players to get rank for'
  })
  readonly playerIDs?: number[];

  @IntQueryProperty({ description: 'Rank flags', default: 0 })
  readonly flags?: number;

  @BooleanQueryProperty({
    description: 'Whether to order by date or not (false for reverse)'
  })
  readonly orderByDate?: boolean;
}

export class MapRankGetNumberQueryDto
  extends QueryDto
  implements MapRankGetNumberQuery
{
  @IntQueryProperty({ description: 'Track number', default: 0 })
  readonly trackNum?: number;

  @IntQueryProperty({ description: 'Zone number', default: 0 })
  readonly zoneNum?: number;

  @IntQueryProperty({ description: 'Rank flags', default: 0 })
  readonly flags?: number;
}

export class MapReviewsGetQueryDto
  extends PagedQueryDto
  implements MapReviewsGetQuery
{
  @BooleanQueryProperty({
    description: 'Filter by official or unofficial reviews'
  })
  readonly official?: boolean;

  @ExpandQueryProperty(['map', 'reviewer'])
  readonly expand?: MapReviewsGetExpand;
}

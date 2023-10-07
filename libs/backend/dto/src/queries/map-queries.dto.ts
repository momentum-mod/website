import {
  MapStatusNew,
  Gamemode,
  MapReviewsGetQuery,
  MapsGetAllExpand,
  MapReviewsGetExpand,
  MapCreditsGetExpand,
  MapsGetExpand,
  MapsGetAllAdminQuery,
  MapsGetAllAdminExpand,
  MapsGetAllSubmissionQuery,
  MapsGetAllSubmissionFilter,
  MapsGetAllSubmissionExpand,
  MapsGetAllSubmissionAdminExpand,
  MapsGetAllSubmissionAdminFilter,
  MapsGetAllSubmissionAdminQuery,
  MapsGetAllAdminFilter,
  MapsGetAllUserSubmissionQuery,
  MapReviewGetIdQuery
} from '@momentum/constants';
import {
  MapCreditsGetQuery,
  MapRankGetNumberQuery,
  MapRanksGetQuery,
  MapsGetAllQuery,
  MapsGetQuery
} from '@momentum/constants';
import {
  BooleanQueryProperty,
  EnumFilterQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  FilterQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty,
  SingleExpandQueryProperty,
  SkipQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import { QueryDto } from './query.dto';
import { OmitType } from '@nestjs/swagger';

//#region Get All

class MapsGetAllBaseQueryDto extends QueryDto {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(100)
  take = 100;

  @StringQueryProperty({
    description: 'Filter by partial map name match (contains)',
    example: 'dust2'
  })
  readonly search?: string;

  @StringQueryProperty({
    description: 'Filter by partial map file name match (startsWith)',
    example: 'de_dust2'
  })
  readonly fileName?: string;

  @IntQueryProperty({ description: 'Filter by submitter ID' })
  readonly submitterID?: number;
}

export class MapsGetAllQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllQuery
{
  @ExpandQueryProperty([
    'zones',
    'leaderboards',
    'info',
    'stats',
    'submitter',
    'credits',
    'thumbnail',
    'images',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord'
  ])
  readonly expand?: MapsGetAllExpand;

  @EnumQueryProperty(Gamemode, { description: 'Filter by map type (gamemode)' })
  readonly gamemode?: Gamemode;

  @IntQueryProperty({ description: 'Filter by tier (lower bound)' })
  readonly difficultyLow?: number;

  @IntQueryProperty({ description: 'Filter by tier (upper bound)' })
  readonly difficultyHigh?: number;

  @BooleanQueryProperty({ description: 'Filter by linear or staged' })
  readonly linear?: boolean;
}

export class MapsGetAllAdminQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllAdminQuery
{
  @ExpandQueryProperty([
    'zones',
    'leaderboards',
    'info',
    'stats',
    'submitter',
    'credits',
    'thumbnail',
    'images'
  ])
  readonly expand?: MapsGetAllAdminExpand;

  @EnumFilterQueryProperty([
    MapStatusNew.APPROVED,
    MapStatusNew.PRIVATE_TESTING,
    MapStatusNew.CONTENT_APPROVAL,
    MapStatusNew.PUBLIC_TESTING,
    MapStatusNew.FINAL_APPROVAL,
    MapStatusNew.DISABLED
  ])
  readonly filter?: MapsGetAllAdminFilter;
}

export class MapsGetAllSubmissionQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllSubmissionQuery
{
  @ExpandQueryProperty([
    'zones',
    'leaderboards',
    'info',
    'stats',
    'submitter',
    'credits',
    'thumbnail',
    'images',
    'inFavorites',
    'inLibrary',
    'personalBest',
    'worldRecord',
    'currentVersion',
    'versions',
    'reviews'
  ])
  readonly expand?: MapsGetAllSubmissionExpand;

  @EnumFilterQueryProperty([
    MapStatusNew.PUBLIC_TESTING,
    MapStatusNew.PRIVATE_TESTING
  ])
  readonly filter?: MapsGetAllSubmissionFilter;
}

export class MapsGetAllUserSubmissionQueryDto
  extends OmitType(MapsGetAllSubmissionQueryDto, ['submitterID'] as const)
  implements MapsGetAllUserSubmissionQuery {}

export class MapsGetAllSubmissionAdminQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllSubmissionAdminQuery
{
  @ExpandQueryProperty([
    'zones',
    'leaderboards',
    'info',
    'stats',
    'submitter',
    'credits',
    'thumbnail',
    'images',
    'currentVersion',
    'versions',
    'reviews'
  ])
  readonly expand?: MapsGetAllSubmissionAdminExpand;

  @EnumFilterQueryProperty([
    MapStatusNew.PUBLIC_TESTING,
    MapStatusNew.PRIVATE_TESTING,
    MapStatusNew.CONTENT_APPROVAL,
    MapStatusNew.FINAL_APPROVAL
  ])
  readonly filter?: MapsGetAllSubmissionAdminFilter;
}

//#endregion
//#region Get

export class MapsGetQueryDto extends QueryDto implements MapsGetQuery {
  @ExpandQueryProperty([
    'zones',
    'leaderboards',
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
    'worldRecord',
    'submission',
    'currentVersion',
    'versions',
    'reviews'
  ])
  readonly expand?: MapsGetExpand;
}

//#endregion
//#region Credits

export class MapCreditsGetQueryDto
  extends QueryDto
  implements MapCreditsGetQuery
{
  @SingleExpandQueryProperty('user')
  readonly expand?: MapCreditsGetExpand;
}

//#endregion
//#region Ranks

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

//#endregion

//#region Reviews

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

export class MapReviewGetIdDto implements MapReviewGetIdQuery {
  @ExpandQueryProperty(['map', 'reviewer'])
  readonly expand?: MapReviewsGetExpand;
}

//#endregion

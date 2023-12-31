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
  MapReviewGetIdQuery,
  TrackType,
  Style,
  MapLeaderboardGetQuery,
  MapRunsGetExpand,
  MapRunsGetFilter,
  MapLeaderboardGetRunQuery
} from '@momentum/constants';
import {
  MapCreditsGetQuery,
  MapsGetAllQuery,
  MapsGetQuery
} from '@momentum/constants';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
  BooleanQueryProperty,
  EnumFilterQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  FilterQueryProperty,
  IntQueryProperty,
  SingleExpandQueryProperty,
  SkipQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import { QueryDto } from './query.dto';

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

  @ApiProperty({
    description:
      'Whether to search based on map name. This will safely handle a map name that is a numeric string.'
  })
  @BooleanQueryProperty({ required: false })
  readonly byName?: boolean;
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
//#region Leaderboards

export class MapLeaderboardGetQueryDto
  extends PagedQueryDto
  implements MapLeaderboardGetQuery
{
  @EnumQueryProperty(Gamemode, { required: true })
  gamemode: Gamemode;

  @EnumQueryProperty(TrackType, { required: false })
  trackType = TrackType.MAIN;

  @IntQueryProperty({ required: false })
  trackNum = 0;

  @EnumQueryProperty(Style, { required: false })
  style = Style.NONE;

  @SingleExpandQueryProperty('stats')
  readonly expand?: MapRunsGetExpand;

  @FilterQueryProperty(['friends', 'around'], {
    example: 'around',
    description:
      "Filter by *either* Steam friends or runs around the logged in user's PB." +
      "If around is used, 'skip' and 'take' are ignored."
  })
  readonly filter?: MapRunsGetFilter;

  @BooleanQueryProperty({
    description: 'Whether to order by date or not (false for reverse)'
  })
  readonly orderByDate?: boolean;
}

export class MapLeaderboardGetRunQueryDto
  extends QueryDto
  implements MapLeaderboardGetRunQuery
{
  @EnumQueryProperty(Gamemode, { required: true })
  gamemode: Gamemode;

  @EnumQueryProperty(TrackType, { required: false })
  trackType = TrackType.MAIN;

  @IntQueryProperty({ required: false })
  trackNum = 0;

  @EnumQueryProperty(Style, { required: false })
  style = Style.NONE;

  @IntQueryProperty({
    required: false,
    description: "Get run for this userID. Either this or 'rank' is required."
  })
  readonly userID?: number;

  @IntQueryProperty({
    required: false,
    description: "Get run at this rank. Either this or 'userID' is required."
  })
  readonly rank?: number;

  @SingleExpandQueryProperty('stats')
  readonly expand?: MapRunsGetExpand;
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

import {
  MapStatus,
  Gamemode,
  MapReviewsGetQuery,
  MapsGetAllExpand,
  MapReviewsGetExpand,
  MapCreditsGetExpand,
  MapsGetExpand,
  MapsGetAllAdminQuery,
  MapsGetAllSubmissionQuery,
  MapsGetAllSubmissionFilter,
  MapsGetAllSubmissionExpand,
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
import { OmitType } from '@nestjs/swagger';
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
  StringCsvQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { PagedQueryDto } from './pagination.dto';
import { QueryDto } from './query.dto';
import { Max } from 'class-validator';

//#region Get All

class MapsGetAllBaseQueryDto extends QueryDto {
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(10, 100)
  take = 10;

  @StringQueryProperty({
    description: 'Filter by partial map name match (contains)',
    example: 'dust2'
  })
  readonly search?: string;

  @StringQueryProperty({
    description: 'Filter by partial map name match (startsWith)',
    example: 'de_dust2'
  })
  readonly searchStartsWith?: string;

  @IntQueryProperty({ description: 'Filter by submitter ID' })
  readonly submitterID?: number;
}

export class MapsGetAllQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllQuery
{
  @ExpandQueryProperty([
    'leaderboards',
    'info',
    'currentVersion',
    'currentVersionWithZones',
    'versions',
    'versionsWithZones',
    'stats',
    'submitter',
    'credits',
    'inFavorites',
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

  @BooleanQueryProperty({
    description: 'Filter by whether map is or is not in user favorites'
  })
  readonly favorite?: boolean;

  @BooleanQueryProperty({
    description:
      'Filter by whether map whether or not the user has beaten the main track of this map.' +
      'If a gamemode is provided, uses that. Otherwise uses any mode.'
  })
  readonly PB?: boolean;
}

export class MapsGetAllAdminQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllAdminQuery
{
  @EnumFilterQueryProperty([
    MapStatus.APPROVED,
    MapStatus.PRIVATE_TESTING,
    MapStatus.CONTENT_APPROVAL,
    MapStatus.PUBLIC_TESTING,
    MapStatus.FINAL_APPROVAL,
    MapStatus.DISABLED
  ])
  readonly filter?: MapsGetAllAdminFilter;
}

export class MapsGetAllSubmissionQueryDto
  extends MapsGetAllBaseQueryDto
  implements MapsGetAllSubmissionQuery
{
  @TakeQueryProperty(10, 100, -1)
  override readonly take = 10;

  @ExpandQueryProperty([
    'leaderboards',
    'info',
    'currentVersion',
    'currentVersionWithZones',
    'versions',
    'versionsWithZones',
    'stats',
    'submitter',
    'credits',
    'inFavorites',
    'personalBest',
    'worldRecord',
    'reviews'
  ])
  readonly expand?: MapsGetAllSubmissionExpand;

  @EnumFilterQueryProperty([
    MapStatus.PRIVATE_TESTING,
    MapStatus.CONTENT_APPROVAL,
    MapStatus.PUBLIC_TESTING,
    MapStatus.FINAL_APPROVAL
  ])
  readonly filter?: MapsGetAllSubmissionFilter;
}

export class MapsGetAllUserSubmissionQueryDto
  extends OmitType(MapsGetAllSubmissionQueryDto, ['submitterID'] as const)
  implements MapsGetAllUserSubmissionQuery {}

//#endregion
//#region Get

export class MapsGetQueryDto extends QueryDto implements MapsGetQuery {
  @ExpandQueryProperty([
    'leaderboards',
    'info',
    'currentVersion',
    'currentVersionWithZones',
    'versions',
    'versionsWithZones',
    'credits',
    'submitter',
    'stats',
    'tracks',
    'inFavorites',
    'personalBest',
    'worldRecord',
    'submission',
    'reviews',
    'testInvites'
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
  trackNum = 1;

  @EnumQueryProperty(Style, { required: false })
  style = Style.NONE;

  @SingleExpandQueryProperty('splits')
  readonly expand?: MapRunsGetExpand;

  @FilterQueryProperty(['friends', 'around'], {
    example: 'around',
    description:
      "Filter by *either* Steam friends or runs around the logged in user's PB." +
      "If around is used, 'skip' and 'take' are ignored."
  })
  readonly filter?: MapRunsGetFilter;

  @IntCsvQueryProperty({ description: 'List of user IDs to limit results to' })
  readonly userIDs?: number[];

  @StringCsvQueryProperty({
    description: 'List of user Steam IDs to limit results to'
  })
  readonly steamIDs?: string[];

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
  trackNum = 1;

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
  // Stupidly high maximum so admins can always fetch everything
  @TakeQueryProperty(20, 1000)
  readonly take?: number = 20;

  @BooleanQueryProperty({
    description: 'Filter by official or unofficial reviews'
  })
  readonly official?: boolean;

  @ExpandQueryProperty(['map', 'reviewer', 'resolver'])
  readonly expand?: MapReviewsGetExpand;

  @IntQueryProperty({
    description: 'Number of comments to fetch (latest first)'
  })
  @Max(50)
  readonly comments?: number;
}

export class MapReviewGetIdDto implements MapReviewGetIdQuery {
  @ExpandQueryProperty(['map', 'reviewer'])
  readonly expand?: MapReviewsGetExpand;
}

//#endregion

import { MapSortType } from '../enums/map-sort-type.enum';

export const MapSortTypeName: ReadonlyMap<MapSortType, string> = new Map([
  [MapSortType.DATE_RELEASED_NEWEST, 'Date Released (Newest)'],
  [MapSortType.DATE_RELEASED_OLDEST, 'Date Released (Oldest)'],
  [MapSortType.DATE_CREATED_NEWEST, 'Date Created (Newest)'],
  [MapSortType.DATE_CREATED_OLDEST, 'Date Created (Oldest)'],
  [MapSortType.ALPHABETICAL, 'Alphabetical (A-Z)'],
  [MapSortType.ALPHABETICAL_REVERSE, 'Alphabetical (Z-A)'],
  [MapSortType.TIER_LOWEST, 'Tier (1-10)'],
  [MapSortType.TIER_HIGHEST, 'Tier (10-1)'],
  [MapSortType.PLAYED_NEWEST, 'Last Played (Newest)'],
  [MapSortType.PLAYED_OLDEST, 'Last Played (Oldest)'],
  [MapSortType.PB_NEWEST, 'Last PB (Newest)'],
  [MapSortType.PB_OLDEST, 'Last PB (Oldest)'],
  [MapSortType.FAVORITED_MOST, 'Most Favorited'],
  [MapSortType.FAVORITED_LEAST, 'Least Favorited'],
  // Abbreviation hack to avoid text overflow on frontend,
  // while still keeping same width and font-size.
  [MapSortType.SUBMISSION_CREATED_NEWEST, 'Submission Created (New)'],
  [MapSortType.SUBMISSION_CREATED_OLDEST, 'Submission Created (Old)'],
  [MapSortType.SUBMISSION_UPDATED_NEWEST, 'Submission Updated (New)'],
  [MapSortType.SUBMISSION_UPDATED_OLDEST, 'Submission Updated (Old)']
]);

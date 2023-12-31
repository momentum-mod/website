import {
  Gamemode,
  Order,
  RunsGetAllExpand,
  RunsGetAllOrder,
  RunsGetAllQuery,
  RunsGetExpand,
  RunsGetQuery,
  Style,
  TrackType
} from '@momentum/constants';
import {
  BooleanQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty,
  SingleExpandQueryProperty,
  SkipQueryProperty,
  StringQueryProperty,
  TakeQueryProperty
} from '../decorators';
import { QueryDto } from './query.dto';

export class PastRunsGetAllQueryDto
  extends QueryDto
  implements RunsGetAllQuery
{
  @SkipQueryProperty(0)
  skip = 0;

  @TakeQueryProperty(10)
  take = 10;

  @ExpandQueryProperty(['user', 'map', 'leaderboardRun'])
  expand?: RunsGetAllExpand;

  @IntQueryProperty({ description: 'Filter by map ID' })
  mapID?: number;

  @StringQueryProperty({ required: false, description: 'Filter by map name' })
  mapName?: string;

  @EnumQueryProperty(Gamemode, { description: 'Filter by gamemode' })
  gamemode?: Gamemode;

  @EnumQueryProperty(TrackType, { description: 'Filter by track type' })
  trackType?: TrackType;

  @IntQueryProperty({ description: 'Filter by track number' })
  trackNum?: number;

  @EnumQueryProperty(Style, { description: 'Filter by style' })
  style?: Style;

  @IntCsvQueryProperty({ description: 'Filter by run flags', isArray: true })
  flags?: number[];

  @IntQueryProperty({ description: 'Filter by user ID' })
  userID?: number;

  @IntCsvQueryProperty({ description: 'Filter by user IDs' })
  userIDs?: number[];

  @BooleanQueryProperty({ description: 'Whether run is a PB' })
  isPB?: boolean;

  @EnumQueryProperty(RunsGetAllOrder)
  orderBy?: RunsGetAllOrder = RunsGetAllOrder.DATE;

  @EnumQueryProperty(Order)
  order?: Order = Order.DESC;
}

export class PastRunsGetQueryDto extends QueryDto implements RunsGetQuery {
  @SingleExpandQueryProperty('user')
  readonly expand?: RunsGetExpand;
}

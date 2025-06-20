import { MapSortType } from '../enums/map-sort-type.enum';
import { Order } from '../types/queries/order.model';

export const MapSortTypeOrder: ReadonlyMap<MapSortType, Order> = new Map([
  [MapSortType.DATE_RELEASED_NEWEST, Order.DESC],
  [MapSortType.DATE_RELEASED_OLDEST, Order.ASC],
  [MapSortType.DATE_CREATED_NEWEST, Order.DESC],
  [MapSortType.DATE_CREATED_OLDEST, Order.ASC],
  [MapSortType.ALPHABETICAL, Order.ASC],
  [MapSortType.REVERSE_ALPHABETICAL, Order.DESC],
  [MapSortType.TIER_LOWEST, Order.ASC],
  [MapSortType.TIER_HIGHEST, Order.DESC],
  [MapSortType.PLAYED_NEWEST, Order.DESC],
  [MapSortType.PLAYED_OLDEST, Order.ASC],
  [MapSortType.PB_NEWEST, Order.DESC],
  [MapSortType.PB_OLDEST, Order.ASC],
  [MapSortType.FAVORITED_MOST, Order.DESC],
  [MapSortType.FAVORITED_LEAST, Order.ASC],
  [MapSortType.SUBMISSION_CREATED_NEWEST, Order.DESC],
  [MapSortType.SUBMISSION_CREATED_OLDEST, Order.ASC],
  [MapSortType.SUBMISSION_UPDATED_NEWEST, Order.DESC],
  [MapSortType.SUBMISSION_UPDATED_OLDEST, Order.ASC]
]);

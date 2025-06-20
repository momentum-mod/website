import { MapSortType, MapSortTypeOrder } from '@momentum/constants';
import { Prisma } from '@prisma/client';

// Gets DB query orderBy obj with property and its order (asc / desc).
export const MapSortTypeOrderByObj: ReadonlyMap<
  MapSortType,
  Prisma.MMapOrderByWithRelationInput
> = new Map([
  [
    MapSortType.DATE_RELEASED_NEWEST,
    {
      info: {
        approvedDate: MapSortTypeOrder.get(MapSortType.DATE_RELEASED_NEWEST)
      }
    }
  ],
  [
    MapSortType.DATE_RELEASED_OLDEST,
    {
      info: {
        approvedDate: MapSortTypeOrder.get(MapSortType.DATE_RELEASED_OLDEST)
      }
    }
  ],
  [
    MapSortType.DATE_CREATED_NEWEST,
    {
      info: {
        creationDate: MapSortTypeOrder.get(MapSortType.DATE_CREATED_NEWEST)
      }
    }
  ],
  [
    MapSortType.DATE_CREATED_OLDEST,
    {
      info: {
        creationDate: MapSortTypeOrder.get(MapSortType.DATE_CREATED_OLDEST)
      }
    }
  ],
  // Sorting includes prefix so Ahop maps will usually take precedence.
  // Need support for db query without prefix to change this.
  [
    MapSortType.ALPHABETICAL,
    { name: MapSortTypeOrder.get(MapSortType.ALPHABETICAL) }
  ],
  [
    MapSortType.REVERSE_ALPHABETICAL,
    { name: MapSortTypeOrder.get(MapSortType.REVERSE_ALPHABETICAL) }
  ],
  /* TODO
    [
      MapSortType.TIER_LOWEST,
      { todo: MapSortTypeOrder.get(MapSortType.TIER_LOWEST) }
    ],
    [
      MapSortType.TIER_HIGHEST,
      { todo: MapSortTypeOrder.get(MapSortType.TIER_HIGHEST) }
    ],
    [
      MapSortType.PLAYED_NEWEST,
      { todo: MapSortTypeOrder.get(MapSortType.PLAYED_NEWEST) }
    ],
    [
      MapSortType.PLAYED_OLDEST,
      { todo: MapSortTypeOrder.get(MapSortType.PLAYED_OLDEST) }
    ],
    [
      MapSortType.PB_NEWEST,
      { todo: MapSortTypeOrder.get(MapSortType.PB_NEWEST) }
    ],
    [
      MapSortType.PB_OLDEST,
      { todo: MapSortTypeOrder.get(MapSortType.PB_OLDEST) }
    ],
    */
  [
    MapSortType.FAVORITED_MOST,
    {
      stats: { favorites: MapSortTypeOrder.get(MapSortType.FAVORITED_MOST) }
    }
  ],
  [
    MapSortType.FAVORITED_LEAST,
    {
      stats: { favorites: MapSortTypeOrder.get(MapSortType.FAVORITED_LEAST) }
    }
  ],
  [
    MapSortType.SUBMISSION_CREATED_NEWEST,
    {
      createdAt: MapSortTypeOrder.get(MapSortType.SUBMISSION_CREATED_NEWEST)
    }
  ],
  [
    MapSortType.SUBMISSION_CREATED_OLDEST,
    {
      createdAt: MapSortTypeOrder.get(MapSortType.SUBMISSION_CREATED_OLDEST)
    }
  ],
  [
    MapSortType.SUBMISSION_UPDATED_NEWEST,
    {
      updatedAt: MapSortTypeOrder.get(MapSortType.SUBMISSION_UPDATED_NEWEST)
    }
  ],
  [
    MapSortType.SUBMISSION_UPDATED_OLDEST,
    {
      updatedAt: MapSortTypeOrder.get(MapSortType.SUBMISSION_UPDATED_OLDEST)
    }
  ]
]);

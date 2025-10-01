import { MapSortType, Order } from '@momentum/constants';
import { Prisma } from '@momentum/db';

// Gets DB query orderBy obj with property and its order (asc / desc).
// Keep this in sync with AllowedMapSortTypes.
export const MapSortTypeOrder: ReadonlyMap<
  MapSortType,
  Prisma.MMapOrderByWithRelationInput
> = new Map([
  [
    MapSortType.DATE_RELEASED_NEWEST,
    {
      info: {
        approvedDate: Order.DESC
      }
    }
  ],
  [
    MapSortType.DATE_RELEASED_OLDEST,
    {
      info: {
        approvedDate: Order.ASC
      }
    }
  ],
  [
    MapSortType.DATE_CREATED_NEWEST,
    {
      info: {
        creationDate: Order.DESC
      }
    }
  ],
  [
    MapSortType.DATE_CREATED_OLDEST,
    {
      info: {
        creationDate: Order.ASC
      }
    }
  ],
  // Sorting includes prefix so Ahop maps will usually take precedence.
  // Would require support for db query without prefix to change this.
  [MapSortType.ALPHABETICAL, { name: Order.ASC }],
  [MapSortType.ALPHABETICAL_REVERSE, { name: Order.DESC }],
  [
    MapSortType.FAVORITED_MOST,
    {
      stats: { favorites: Order.DESC }
    }
  ],
  [
    MapSortType.FAVORITED_LEAST,
    {
      stats: { favorites: Order.ASC }
    }
  ],
  [
    MapSortType.SUBMISSION_CREATED_NEWEST,
    {
      createdAt: Order.DESC
    }
  ],
  [
    MapSortType.SUBMISSION_CREATED_OLDEST,
    {
      createdAt: Order.ASC
    }
  ],
  [
    MapSortType.SUBMISSION_UPDATED_NEWEST,
    {
      updatedAt: Order.DESC
    }
  ],
  [
    MapSortType.SUBMISSION_UPDATED_OLDEST,
    {
      updatedAt: Order.ASC
    }
  ]
]);

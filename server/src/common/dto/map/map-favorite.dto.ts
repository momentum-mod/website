import { MapFavorite } from '@prisma/client';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';

export class MapFavoriteDto implements MapFavorite {
  @IdProperty()
  readonly id: number;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true })
  readonly map: MapDto;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

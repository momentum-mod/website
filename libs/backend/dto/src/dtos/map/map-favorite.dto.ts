import { MapFavorite } from '@momentum/constants';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

export class MapFavoriteDto implements MapFavorite {
  @IdProperty()
  readonly id: number;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true, required: false })
  @Expose()
  get map(): MapDto {
    return plainToInstance(MapDto, this.mmap);
  }

  @Exclude()
  readonly mmap: MapDto;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

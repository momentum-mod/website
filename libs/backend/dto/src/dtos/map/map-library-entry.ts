import { MapLibraryEntry } from '@momentum/constants';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { Exclude, Expose } from 'class-transformer';

export class MapLibraryEntryDto implements MapLibraryEntry {
  @IdProperty()
  readonly id: number;

  @IdProperty({ description: 'ID of the user who owns the entry' })
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty({ description: 'ID of the map the entry refers to' })
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true, required: false })
  @Expose()
  get map(): MapDto {
    return this.mmap;
  }

  @Exclude()
  readonly mmap: MapDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

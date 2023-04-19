import { MapLibraryEntry } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '@lib/dto.lib';
import { MapDto } from './map.dto';

export class MapLibraryEntryDto implements MapLibraryEntry {
  @IdProperty()
  readonly id: number;

  @IdProperty({ description: 'ID of the user who owns the entry' })
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty({ description: 'ID of the map the entry refers to' })
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true })
  readonly map: MapDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

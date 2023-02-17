import { MapLibraryEntry } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { CreatedAtProperty, IdProperty, NestedProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { MapDto } from './map.dto';

export class MapLibraryEntryDto implements MapLibraryEntry {
    @IdProperty()
    id: number;

    @IdProperty({ description: 'ID of the user who owns the entry' })
    userID: number;

    @NestedProperty(UserDto, { lazy: true })
    user: UserDto;

    @IdProperty({ description: 'ID of the map the entry refers to' })
    mapID: number;

    @NestedProperty(MapDto, { lazy: true })
    map: MapDto;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

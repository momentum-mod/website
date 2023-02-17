import { MapFavorite } from '@prisma/client';
import { CreatedAtProperty, IdProperty, NestedProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';

export class MapFavoriteDto implements MapFavorite {
    @IdProperty()
    id: number;

    @IdProperty()
    mapID: number;

    @NestedProperty(MapDto, { lazy: true })
    map: MapDto;

    @IdProperty()
    userID: number;

    @NestedProperty(UserDto, { lazy: true })
    user: UserDto;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

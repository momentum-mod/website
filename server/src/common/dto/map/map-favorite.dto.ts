import { MapFavorite } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { Exclude } from 'class-transformer';

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

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

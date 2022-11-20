import { MapFavorite } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';

export class MapFavoriteDto implements MapFavorite {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @NestedDto(MapDto, { type: () => MapDto })
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @NestedDto(UserDto, { type: () => UserDto })
    user: UserDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

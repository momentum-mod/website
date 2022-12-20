import { MapFavorite } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { Exclude } from 'class-transformer';

export class MapFavoriteDto implements MapFavorite {
    @ApiProperty()
    @IsPositive()
    id: number;

    @Exclude()
    mapID: number;

    @NestedDto(MapDto, { type: () => MapDto })
    map: MapDto;

    @ApiProperty()
    @IsPositive()
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

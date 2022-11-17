import { MapFavorite } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, ValidateNested } from 'class-validator';
import { DtoFactory } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { Transform } from 'class-transformer';

export class MapFavoriteDto implements MapFavorite {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @Transform(({ value }) => DtoFactory(MapDto, value))
    @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

import { MapLibraryEntry } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { UserDto } from '../user/user.dto';
import { NestedDto } from '@lib/dto.lib';
import { MapDto } from './map.dto';

export class MapLibraryEntryDto implements MapLibraryEntry {
    @IdProperty()
    id: number;

    @IdProperty({ description: 'ID of the user who owns the entry' })
    userID: number;

    @NestedDto(UserDto, { type: () => UserDto })
    user: UserDto;

    @IdProperty({ description: 'ID of the map the entry refers to' })
    mapID: number;

    @NestedDto(MapDto, { type: () => MapDto })
    map: MapDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

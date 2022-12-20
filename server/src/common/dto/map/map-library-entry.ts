import { MapLibraryEntry } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { UserDto } from '../user/user.dto';
import { NestedDto } from '@lib/dto.lib';
import { MapDto } from './map.dto';

export class MapLibraryEntryDto implements MapLibraryEntry {
    @ApiProperty({
        type: Number,
        description: 'The ID of the library entry'
    })
    @IsPositive()
    id: number;

    @ApiProperty()
    @IsPositive()
    userID: number;

    @NestedDto(UserDto, { type: () => UserDto })
    user: UserDto;

    @ApiProperty()
    @IsPositive()
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

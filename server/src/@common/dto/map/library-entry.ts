﻿import { MapLibraryEntry } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, ValidateNested } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { UserDto } from '../user/user.dto';
import { DtoFactory } from '../../utils/dto.utility';
import { MapDto } from './map.dto';

export class MapLibraryEntryDto implements MapLibraryEntry {
    @ApiProperty({
        type: Number,
        description: 'The ID of the library entry'
    })
    @IsInt()
    id: number;

    @Exclude()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @Exclude()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @Transform(({ value }) => DtoFactory(MapDto, value))
    @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

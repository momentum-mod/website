import { MapLibraryEntry } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, ValidateNested } from 'class-validator';
import { Exclude } from 'class-transformer';
import { UserDto } from '../user/user.dto';
import { DtoTransform } from '../../utils/dto-utils';
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

    @ApiProperty({
        type: UserDto,
        description: 'The user that owns the library entry'
    })
    @DtoTransform(UserDto)
    @ValidateNested()
    user: UserDto;

    @Exclude()
    mapID: number;

    @ApiProperty({
        type: MapDto,
        description: 'The map that is being stored in the library'
    })
    @DtoTransform(MapDto)
    // TODO: Add back
    //  @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

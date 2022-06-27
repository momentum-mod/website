import { MapLibraryEntry } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDateString, IsInt, ValidateNested } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { UserDto } from '../user/user.dto';
import { DtoUtils } from '../../utils/dto-utils';
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
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @Exclude()
    mapID: number;

    @ApiProperty({
        type: MapDto,
        description: 'The map that is being stored in the library'
    })
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
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

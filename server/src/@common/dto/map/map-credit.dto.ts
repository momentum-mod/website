import { MapCredit } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { MapCreditType } from '../../enums/map.enum';
import { DtoTransform } from '../../utils/dto-utils';

export class MapCreditDto implements MapCredit {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsEnum(MapCreditType)
    type: MapCreditType;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => UserDto })
    @DtoTransform(UserDto)
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    @DtoTransform(MapDto)
    // TODO: Add back once this is worked on
    // @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

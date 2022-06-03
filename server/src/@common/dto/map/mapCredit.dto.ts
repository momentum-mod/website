import { MapCredit, User, Map } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt } from 'class-validator';
import { EMapCreditType } from '../../enums/map.enum';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';

export class MapCreditDto implements MapCredit {
    @ApiProperty()
    @IsInt()
    id: number;

    @ApiProperty()
    @IsEnum(EMapCreditType)
    type: EMapCreditType;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @Transform(({ value }) => new UserDto(value))
    user: UserDto;

    @ApiProperty()
    @Transform(({ value }) => new MapDto(value))
    map: MapDto;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    constructor(_mapCredit: Partial<MapCredit>) {
        DtoUtils.ShapeSafeObjectAssign(this, _mapCredit);
    }
}

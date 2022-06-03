import { MapCredit, User, Map } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsOptional } from 'class-validator';
import { EMapCreditType } from '../../enums/map.enum';

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
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    @ApiProperty()
    @IsOptional()
    user: UserDto;

    @ApiProperty()
    @IsOptional()
    map: MapDto;

    constructor(_mapCredit: MapCredit, _user?: UserDto, _map?: MapDto) {
        this.id = _mapCredit.id;
        this.type = _mapCredit.type;
        this.createdAt = _mapCredit.createdAt;
        this.updatedAt = _mapCredit.updatedAt;
        this.mapID = _mapCredit.mapID;
        this.userID = _mapCredit.userID;
        if (_user) this.user = _user;
        if (_map) this.map = _map;
    }
}

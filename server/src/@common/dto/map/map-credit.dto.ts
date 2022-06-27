import { MapCredit } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDateString, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { MapCreditType } from '../../enums/map.enum';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';

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
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
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

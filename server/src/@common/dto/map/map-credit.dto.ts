import { MapCredit } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsInt, ValidateNested } from 'class-validator';
import { MapCreditType } from '../../enums/map.enum';
import { DtoFactory } from '../../utils/dto.utility';
import { Exclude, Transform } from 'class-transformer';

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
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty({ type: () => MapDto })
    @Transform(({ value }) => DtoFactory(MapDto, value))
    @ValidateNested()
    map: MapDto;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class CreateMapCreditDto extends PickType(MapCreditDto, ['userID', 'type'] as const) {}

import { MapCredit } from '@prisma/client';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsPositive } from 'class-validator';
import { MapCreditType } from '../../enums/map.enum';
import { NestedDto } from '@lib/dto.lib';
import { Exclude } from 'class-transformer';

export class MapCreditDto implements MapCredit {
    @IdProperty()
    id: number;

    @EnumProperty(MapCreditType)
    type: MapCreditType;

    @IdProperty()
    userID: number;

    @NestedProperty(UserDto, { lazy: true })
    user: UserDto;

    @IdProperty()
    mapID: number;

    @NestedProperty(MapDto, { lazy: true })
    map: MapDto;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

export class CreateMapCreditDto extends PickType(MapCreditDto, ['userID', 'type'] as const) {}

export class UpdateMapCreditDto {
    @IdProperty({ required: false, description: 'The new user ID to set' })
    userID: number;

    @EnumProperty(MapCreditType, { required: false, description: 'The new map credit type to set' })
    type: number;
}

import {
  MapCredit,
  CreateMapCredit,
  MAX_CREDIT_DESCRIPTION_LENGTH
} from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { EnumProperty, IdProperty, NestedProperty } from '../../decorators';
import { MapCreditType } from '@momentum/constants';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MapCreditDto implements MapCredit {
  @EnumProperty(MapCreditType)
  readonly type: MapCreditType;

  @ApiProperty({
    description: "Description of the user's contribution",
    example: 'Stage 3'
  })
  @IsString()
  @IsOptional()
  @MaxLength(MAX_CREDIT_DESCRIPTION_LENGTH)
  readonly description: string;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true, required: false })
  @Expose()
  get map(): MapDto {
    return plainToInstance(MapDto, this.mmap);
  }

  @Exclude()
  readonly mmap: MapDto;
}

export class CreateMapCreditDto
  extends PickType(MapCreditDto, ['userID', 'type', 'description'] as const)
  implements CreateMapCredit {}

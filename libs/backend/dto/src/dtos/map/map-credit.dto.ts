import {
  MapCredit,
  CreateMapCredit,
  UpdateMapCredit
} from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { PickType } from '@nestjs/swagger';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { MapCreditType } from '@momentum/constants';
import { Exclude, Expose } from 'class-transformer';

export class MapCreditDto implements MapCredit {
  @IdProperty()
  readonly id: number;

  @EnumProperty(MapCreditType)
  readonly type: MapCreditType;

  @IdProperty()
  readonly userID: number;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { lazy: true, required: false })
  @Expose()
  get map(): MapDto {
    return this.mmap;
  }

  @Exclude()
  readonly mmap: MapDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateMapCreditDto
  extends PickType(MapCreditDto, ['userID', 'type'] as const)
  implements CreateMapCredit {}

export class UpdateMapCreditDto implements UpdateMapCredit {
  @IdProperty({ required: false, description: 'The new user ID to set' })
  userID: number;

  @EnumProperty(MapCreditType, {
    required: false,
    description: 'The new map credit type to set'
  })
  type: number;
}

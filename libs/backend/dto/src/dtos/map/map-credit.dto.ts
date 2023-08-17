import {
  MapCredit,
  CreateMapCredit,
  MAX_CREDIT_DESCRIPTION_LENGTH
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
}

export class CreateMapCreditDto
  extends PickType(MapCreditDto, ['userID', 'type'] as const)
  implements CreateMapCredit {}

import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt } from 'class-validator';
import {
  CreateMapTestInvite,
  MapTestInvite,
  MapTestInviteState,
  MAX_TEST_INVITES,
  UpdateMapTestInvite
} from '@momentum/constants';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { UserDto } from '../user/user.dto';

export class MapTestInviteDto implements MapTestInvite {
  @IdProperty()
  mapID: number;

  @IdProperty()
  userID: number;

  @NestedProperty(UserDto, { lazy: true })
  user?: UserDto;

  @EnumProperty(MapTestInviteState)
  state: number;

  @CreatedAtProperty()
  createdAt: Date;

  @UpdatedAtProperty()
  updatedAt: Date;
}

export class CreateMapTestInviteDto implements CreateMapTestInvite {
  @ApiProperty({
    description: `
      Array of userIDs to invite/disinvite.
      Users on array, without existing invites are added,
      users not on array WITH existing invites are removed.
      `
  })
  @IsArray()
  @ArrayMaxSize(MAX_TEST_INVITES)
  @IsInt({ each: true })
  readonly userIDs: number[];
}

export class UpdateMapTestInviteDto implements UpdateMapTestInvite {
  @ApiProperty({ description: 'Whether to accept the request or not' })
  @IsBoolean()
  readonly accept: boolean;
}

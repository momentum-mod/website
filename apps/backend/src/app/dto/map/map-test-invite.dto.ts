import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt } from 'class-validator';
import {
  CreateMapTestInvite,
  MAX_TEST_INVITES,
  UpdateMapTestInvite
} from '@momentum/constants';

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

import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt } from 'class-validator';
import {
  CreateMapTestingRequest,
  UpdateMapTestingRequest
} from '@momentum/constants';
import { Config } from '@momentum/backend/config';

const MAX_TESTING_REQUESTS = Config.limits.testingRequests;

export class CreateMapTestingRequestDto implements CreateMapTestingRequest {
  @ApiProperty({
    description: `
      Array of userIDs to invite/disinvite.
      Users on array, without existing invites are added,
      users not on array WITH existing invites are removed.
      `
  })
  @IsArray()
  @ArrayMaxSize(MAX_TESTING_REQUESTS)
  @IsInt({ each: true })
  userIDs: number[];
}

export class UpdateMapTestingRequestDto implements UpdateMapTestingRequest {
  @ApiProperty({ description: 'Whether to accept the request or not' })
  @IsBoolean()
  accept: boolean;
}

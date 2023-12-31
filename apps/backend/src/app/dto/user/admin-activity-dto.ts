import { AdminActivity, AdminActivityType } from '@momentum/constants';
import {
  IsNumberString,
  IsObject,
  IsOptional,
  IsString
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatedAtProperty, EnumProperty, IdProperty } from '../decorators';

export class AdminActivityDto implements AdminActivity {
  @IdProperty()
  id: number;

  @ApiProperty({
    description: 'Optional comment for the activity'
  })
  @IsString()
  @IsOptional()
  comment: string;

  @EnumProperty(AdminActivityType, { description: 'The type of activity' })
  type: number;

  @ApiProperty({
    description: 'The ID of object changed on activity',
    type: String
  })
  @IsNumberString()
  target: bigint;

  @ApiProperty({ description: 'Old state of object' })
  @IsObject()
  oldData: object;

  @ApiProperty({ description: 'New state of object' })
  @IsObject()
  newData: object;

  @IdProperty({ description: 'The user ID of admin, who did the activity' })
  userID: number;

  @CreatedAtProperty()
  createdAt: Date;
}

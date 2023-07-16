import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import {
  CreatedAtProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { Profile } from '@momentum/types';
import { SocialsDto } from './socials.dto';

export class ProfileDto implements Profile {
  @Exclude()
  readonly id: number;

  @ApiProperty({ type: Number, description: 'The ID of the user' })
  @IsInt()
  readonly userID: number;

  @ApiProperty({ type: String, description: 'The text-based bio of the user' })
  @IsString()
  readonly bio: string;

  @NestedProperty(SocialsDto)
  readonly socials: SocialsDto;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

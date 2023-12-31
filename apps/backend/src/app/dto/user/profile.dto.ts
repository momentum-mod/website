import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { Profile } from '@momentum/constants';
import { NestedProperty } from '../decorators';
import { SocialsDto } from './socials.dto';

export class ProfileDto implements Profile {
  @ApiProperty({ type: Number, description: 'The ID of the user' })
  @IsInt()
  readonly userID: number;

  @ApiProperty({ type: String, description: 'The text-based bio of the user' })
  @IsString()
  readonly bio: string;

  @NestedProperty(SocialsDto)
  readonly socials: SocialsDto;
}

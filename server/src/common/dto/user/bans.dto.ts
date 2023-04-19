import { Bans } from '@prisma/client';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class BansDto implements Bans {
  @ApiProperty({
    description: 'If the user is banned from submitting runs',
    type: Boolean
  })
  @IsBoolean()
  readonly leaderboards: boolean;

  @ApiProperty({
    description: 'If the user is banned from updating their alias',
    type: Boolean
  })
  @IsBoolean()
  readonly alias: boolean;

  @ApiProperty({
    description: 'If the user is banned from updating their avatar',
    type: Boolean
  })
  @IsBoolean()
  readonly avatar: boolean;

  @ApiProperty({
    description: 'If the user is banned from updating their bio',
    type: Boolean
  })
  @IsBoolean()
  readonly bio: boolean;

  @Exclude()
  readonly userID: number;
}

export class UpdateBansDto extends PartialType(
  OmitType(BansDto, ['userID'] as const)
) {}

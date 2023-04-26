import { Roles } from '@prisma/client';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Exclude } from 'class-transformer';

export class RolesDto implements Roles {
  @ApiProperty({ description: 'If the user is verified', type: Boolean })
  @IsBoolean()
  readonly verified: boolean;

  @ApiProperty({ description: 'If the user is a mapper', type: Boolean })
  @IsBoolean()
  readonly mapper: boolean;

  @ApiProperty({ description: 'If the user is a moderator', type: Boolean })
  @IsBoolean()
  readonly moderator: boolean;

  @ApiProperty({ description: 'If the user is an admin', type: Boolean })
  @IsBoolean()
  readonly admin: boolean;

  @ApiProperty({
    description:
      'If the user is a placeholder, i.e. has no actual Steam account, usually used for map credits',
    type: Boolean
  })
  @IsBoolean()
  readonly placeholder: boolean;

  @Exclude()
  readonly userID: number;
}

export class UpdateRolesDto extends PartialType(
  OmitType(RolesDto, ['userID'] as const)
) {}

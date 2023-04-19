import { UserStats } from '@prisma/client';
import { CreatedAtProperty, IdProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { IsNumberString } from '@common/validators/is-number-string.validator';

export class UserStatsDto implements UserStats {
  @IdProperty()
  readonly id: number;

  @Exclude()
  readonly userID: number;

  @ApiProperty({ type: String, description: "The user's total cosmetic XP" })
  @IsNumberString()
  readonly cosXP: bigint;

  @ApiProperty({ type: String, description: "The user's level" })
  @IsInt()
  readonly level: number;

  @ApiProperty({ type: String, description: 'Total maps completed' })
  @IsInt()
  readonly mapsCompleted: number;

  @ApiProperty({ type: String, description: 'Total runs submitted' })
  @IsInt()
  readonly runsSubmitted: number;

  @ApiProperty({
    type: String,
    description: "The user's total number of jumps"
  })
  @IsNumberString()
  readonly totalJumps: bigint;

  @ApiProperty({
    type: String,
    description: "The user's total number of strafes"
  })
  @IsNumberString()
  readonly totalStrafes: bigint;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

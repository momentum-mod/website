import { UserStats } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { SafeBigIntToNumber } from '../../decorators';

export class UserStatsDto implements UserStats {
  @Exclude()
  readonly userID: number;

  @ApiProperty({ type: Number, description: "The user's total cosmetic XP" })
  @SafeBigIntToNumber()
  @IsInt()
  readonly cosXP: bigint;

  @ApiProperty({ type: Number, description: "The user's level" })
  @IsInt()
  readonly level: number;

  @ApiProperty({ type: Number, description: 'Total maps completed' })
  @IsInt()
  readonly mapsCompleted: number;

  @ApiProperty({ type: Number, description: 'Total runs submitted' })
  @IsInt()
  readonly runsSubmitted: number;

  @ApiProperty({
    type: Number,
    description: "The user's total number of jumps"
  })
  @SafeBigIntToNumber()
  @IsInt()
  readonly totalJumps: bigint;

  @ApiProperty({
    type: Number,
    description: "The user's total number of strafes"
  })
  @SafeBigIntToNumber()
  @IsInt()
  readonly totalStrafes: bigint;
}

import { UserStats } from '@prisma/client';
import { CreatedAtProperty, IdProperty, UpdatedAtProperty } from '@lib/dto.lib';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { IsNumberString } from '@common/validators/is-number-string.validator';

export class UserStatsDto implements UserStats {
    @IdProperty()
    id: number;

    @Exclude()
    userID: number;

    @ApiProperty({ type: String, description: "The user's total cosmetic XP" })
    @IsNumberString()
    cosXP: bigint;

    @ApiProperty({ type: String, description: "The user's level" })
    @IsInt()
    level: number;

    @ApiProperty({ type: String, description: 'Total maps completed' })
    @IsInt()
    mapsCompleted: number;

    @ApiProperty({ type: String, description: 'Total runs submitted' })
    @IsInt()
    runsSubmitted: number;

    @ApiProperty({ type: String, description: "The user's total number of jumps" })
    @IsNumberString()
    totalJumps: bigint;

    @ApiProperty({ type: String, description: "The user's total number of strafes" })
    @IsNumberString()
    totalStrafes: bigint;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

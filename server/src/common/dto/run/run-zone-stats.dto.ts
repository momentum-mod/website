import { RunZoneStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class RunZoneStatsDto implements RunZoneStats {
    @ApiProperty()
    @IsPositiveNumberString()
    id: number;

    @ApiProperty()
    @IsPositive()
    zoneNum: number;

    @ApiProperty()
    @IsPositiveNumberString()
    runID: bigint;

    @ApiProperty()
    @IsPositiveNumberString()
    baseStatsID: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

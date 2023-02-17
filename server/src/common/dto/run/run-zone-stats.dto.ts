import { RunZoneStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsPositive } from 'class-validator';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class RunZoneStatsDto implements PrismaModelToDto<RunZoneStats> {
    @ApiProperty()
    id: number;

    @ApiProperty()
    @IsPositive()
    zoneNum: number;

    @IdProperty({ bigint: true })
    runID: number;

    @IdProperty({ bigint: true })
    baseStatsID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

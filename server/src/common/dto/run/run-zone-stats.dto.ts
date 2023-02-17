import { RunZoneStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsPositive } from 'class-validator';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

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

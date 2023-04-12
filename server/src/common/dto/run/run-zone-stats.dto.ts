import { RunZoneStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsPositive } from 'class-validator';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class RunZoneStatsDto implements PrismaModelToDto<RunZoneStats> {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    @IsPositive()
    readonly zoneNum: number;

    @IdProperty({ bigint: true })
    readonly runID: number;

    @IdProperty({ bigint: true })
    readonly baseStatsID: number;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

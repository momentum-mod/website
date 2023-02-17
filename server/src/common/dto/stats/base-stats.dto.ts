import { BaseStats } from '@prisma/client';
import { IsInt, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class BaseStatsDto implements PrismaModelToDto<BaseStats> {
    @IdProperty({ bigint: true })
    id: number;

    @ApiProperty()
    @IsInt()
    jumps: number;

    @ApiProperty()
    @IsNumber()
    strafes: number;

    @ApiProperty()
    @IsNumber()
    avgStrafeSync: number;

    @ApiProperty()
    @IsNumber()
    avgStrafeSync2: number;

    @ApiProperty()
    @IsNumber()
    enterTime: number;

    @ApiProperty()
    @IsNumber()
    totalTime: number;

    @ApiProperty()
    @IsNumber()
    velAvg3D: number;

    @ApiProperty()
    @IsNumber()
    velAvg2D: number;

    @ApiProperty()
    @IsNumber()
    velMax3D: number;

    @ApiProperty()
    @IsNumber()
    velMax2D: number;

    @ApiProperty()
    @IsNumber()
    velEnter3D: number;

    @ApiProperty()
    @IsNumber()
    velEnter2D: number;

    @ApiProperty()
    @IsNumber()
    velExit3D: number;

    @ApiProperty()
    @IsNumber()
    velExit2D: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

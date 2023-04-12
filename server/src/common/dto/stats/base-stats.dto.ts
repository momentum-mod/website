import { BaseStats } from '@prisma/client';
import { IsInt, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class BaseStatsDto implements PrismaModelToDto<BaseStats> {
    @IdProperty({ bigint: true })
    readonly id: number;

    @ApiProperty()
    @IsInt()
    readonly jumps: number;

    @ApiProperty()
    @IsNumber()
    readonly strafes: number;

    @ApiProperty()
    @IsNumber()
    readonly avgStrafeSync: number;

    @ApiProperty()
    @IsNumber()
    readonly avgStrafeSync2: number;

    @ApiProperty()
    @IsNumber()
    readonly enterTime: number;

    @ApiProperty()
    @IsNumber()
    readonly totalTime: number;

    @ApiProperty()
    @IsNumber()
    readonly velAvg3D: number;

    @ApiProperty()
    @IsNumber()
    readonly velAvg2D: number;

    @ApiProperty()
    @IsNumber()
    readonly velMax3D: number;

    @ApiProperty()
    @IsNumber()
    readonly velMax2D: number;

    @ApiProperty()
    @IsNumber()
    readonly velEnter3D: number;

    @ApiProperty()
    @IsNumber()
    readonly velEnter2D: number;

    @ApiProperty()
    @IsNumber()
    readonly velExit3D: number;

    @ApiProperty()
    @IsNumber()
    readonly velExit2D: number;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

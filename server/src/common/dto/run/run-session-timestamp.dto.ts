﻿import { RunSessionTimestamp } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class RunSessionTimestampDto implements PrismaModelToDto<RunSessionTimestamp> {
    @IdProperty({ bigint: true })
    readonly id: number;

    @ApiProperty()
    @IsInt()
    readonly zone: number;

    @ApiProperty()
    @IsInt()
    readonly tick: number;

    @IdProperty({ bigint: true })
    readonly sessionID: number;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

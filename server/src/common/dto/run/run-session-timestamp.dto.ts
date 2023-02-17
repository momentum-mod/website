import { RunSessionTimestamp } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class RunSessionTimestampDto implements PrismaModelToDto<RunSessionTimestamp> {
    @IdProperty({ bigint: true })
    id: number;

    @ApiProperty()
    @IsInt()
    zone: number;

    @ApiProperty()
    @IsInt()
    tick: number;

    @IdProperty({ bigint: true })
    sessionID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

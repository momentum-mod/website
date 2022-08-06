import { RunSessionTimestamp } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RunSessionTimestampDto implements RunSessionTimestamp {
    @ApiProperty()
    id: bigint;

    @ApiProperty()
    zone: number;

    @ApiProperty()
    tick: number;

    @ApiProperty()
    sessionID: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

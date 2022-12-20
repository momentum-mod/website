import { RunSessionTimestamp } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt } from 'class-validator';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class RunSessionTimestampDto implements RunSessionTimestamp {
    @ApiProperty()
    @IsPositiveNumberString()
    id: bigint;

    @ApiProperty()
    @IsInt()
    zone: number;

    @ApiProperty()
    @IsInt()
    tick: number;

    @ApiProperty()
    @IsPositiveNumberString()
    sessionID: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

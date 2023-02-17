import { RunSessionTimestamp } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt } from 'class-validator';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

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

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

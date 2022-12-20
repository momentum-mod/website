﻿import { ApiProperty, PickType } from '@nestjs/swagger';
import { RunSession } from '@prisma/client';
import { IsDateString, IsInt, IsPositive } from 'class-validator';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

export class RunSessionDto implements RunSession {
    @ApiProperty({
        type: String,
        description: 'The ID of the run run'
    })
    @IsPositiveNumberString()
    id: bigint;

    @ApiProperty({
        description: 'The number of the track the run is on, 0 is main track',
        type: Number,
        required: true
    })
    @IsInt()
    trackNum: number;

    @ApiProperty({
        description: 'The zone the run is on. Non-zero will imply an IL run, which are not yet implemented',
        type: Number,
        required: true
    })
    @IsInt()
    zoneNum: number;

    @ApiProperty({
        description: 'The ID of the user submitting the run',
        type: Number,
        required: true
    })
    @IsPositive()
    userID: number;

    @ApiProperty({
        description: 'The ID of the MapTrack the run is on',
        type: Number,
        required: true
    })
    @IsPositive()
    trackID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class CreateRunSessionDto extends PickType(RunSessionDto, ['trackNum', 'zoneNum' as const]) {
    @ApiProperty({
        description: 'The map the run is on',
        type: Number,
        required: true
    })
    @IsPositive()
    mapID: number;
}

export class UpdateRunSessionDto {
    @ApiProperty({
        description: 'The zone the run is on',
        type: Number,
        required: true
    })
    @IsInt()
    zoneNum: number;

    @ApiProperty({
        description: 'The run tick at time of request',
        type: Number,
        required: true
    })
    @IsPositive()
    tick: number;
}

import { ApiProperty, PickType } from '@nestjs/swagger';
import { RunSession } from '@prisma/client';
import { IsInt, IsPositive } from 'class-validator';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class RunSessionDto implements PrismaModelToDto<RunSession> {
    @IdProperty({ bigint: true })
    id: number;

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

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
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

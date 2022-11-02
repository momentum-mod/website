import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { MapStatus } from '../../enums/map.enum';
import { ExpandQueryDecorators, SkipQueryDecorators, TakeQueryDecorators } from '../../utils/dto.utility';

export class RunsGetAllQuery {
    @SkipQueryDecorators(0)
    skip = 0;

    @TakeQueryDecorators(10)
    take = 10;

    @ExpandQueryDecorators(['overallStats', 'map', 'mapWithInfo', 'rank', 'zoneStats'])
    expand: string[];

    @ApiPropertyOptional({
        name: 'mapID',
        type: Number,
        description: 'Filter by map ID'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    mapID: number;

    @ApiPropertyOptional({
        name: 'mapName',
        type: String,
        description: 'Filter by map name'
    })
    @IsOptional()
    mapName: string;

    // Not sure if these two are supposed to be user IDs or steam IDs. Going to assume userid for now,
    // if I'm wrong do steam ID handling like users/getall does.
    @ApiPropertyOptional({
        name: 'userID',
        type: Number,
        description: 'Filter by user ID'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    userID: number;

    @ApiPropertyOptional({
        name: 'userIDs',
        type: Number,
        description: 'Filter by CSV list of user IDs'
    })
    @Transform(({ value }) => value.split(',').map((v) => parseInt(v)))
    @IsOptional()
    userIDs: number[];

    // I'm not completely sure this is right, enum handling might not be valid - Tom
    @ApiPropertyOptional({
        name: 'flags',
        enum: MapStatus,
        type: Number,
        description: 'Filter by run flags (I dont really know what this is, I think a 0.10/0.11 thing -Tom)'
    })
    @IsOptional()
    @Type(() => Number)
    flags: number;

    @ApiPropertyOptional({
        name: 'isPB',
        type: Boolean,
        description: 'Whether or not to filter by only personal best runs.'
    })
    @IsOptional()
    isPB: boolean;

    @ApiPropertyOptional({
        name: 'order',
        enum: ['date', 'time'],
        type: String,
        description: 'Order by date or time'
    })
    @IsOptional()
    order: string;
}

export class MapsCtlRunsGetAllQuery extends OmitType(RunsGetAllQuery, ['mapID', 'mapName'] as const) {}

export class RunsGetQuery {
    @ExpandQueryDecorators(['overallStats', 'map', 'mapWithInfo', 'rank', 'zoneStats'])
    expand: string[];
}

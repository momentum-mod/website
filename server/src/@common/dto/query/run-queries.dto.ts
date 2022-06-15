import { PaginationQuery } from './pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { EMapStatus } from '../../enums/map.enum';

export class RunsGetAllQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'mapID',
        type: Number,
        description: 'Filter by map ID'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    mapID: number;

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
        name: 'userID',
        type: Number,
        description: 'Filter by CSV list of user IDs'
    })
    @Transform(({ value }) => value.split(',').map((v) => parseInt(v)))
    @IsOptional()
    userIDs: number[];

    // I'm not completely sure this is right, enum handling might not be valid - Tom
    @ApiPropertyOptional({
        name: 'flags',
        enum: EMapStatus,
        type: Number,
        description: 'Filter by run flags (I dont really know what this is, I think a 0.10/0.11 thing -Tom)'
    })
    @IsOptional()
    @Type(() => Number)
    flags: number;
}

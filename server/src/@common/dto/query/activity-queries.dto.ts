import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination.dto';
import { EActivityTypes } from '../../enums/activity.enum';

export class ActivitiesGetQuery extends PaginationQueryDto {
    @ApiPropertyOptional({
        name: 'userID',
        type: String,
        description: 'Filter by user ID'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    userID: number;

    @ApiPropertyOptional({
        name: 'type',
        enum: EActivityTypes,
        type: String,
        description: 'Types of activities to include'
    })
    @IsOptional()
    @Type(() => Number)
    // TODO: are these flags?
    @IsEnum(EActivityTypes)
    type: EActivityTypes;

    @ApiPropertyOptional({
        name: 'data',
        type: BigInt,
        description: 'The ID into the table of the corresponding activity'
    })
    @IsOptional()
    @Transform(({ value }) => BigInt(value))
    data: bigint;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../@common/dto/common/pagination.dto';
import { EActivityTypes } from '../../../@common/enums/activity.enum';

export class UsersGetActivitiesQuery extends PaginationQueryDto {
    @ApiPropertyOptional({
        name: 'type',
        enum: EActivityTypes,
        description: 'Type of activity to include'
    })
    @IsOptional()
    @Type(() => Number)
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

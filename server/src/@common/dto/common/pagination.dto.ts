import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
    @ApiPropertyOptional({
        name: 'skip',
        type: Number,
        default: 0,
        description: 'Skip this many records'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    skip = 0;

    @ApiPropertyOptional({
        name: 'take',
        type: Number,
        default: 20,
        description: 'Take this many records'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    take = 20;
}

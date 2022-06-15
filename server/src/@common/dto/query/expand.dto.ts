import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExpandQuery {
    @ApiPropertyOptional({
        name: 'expand',
        type: String
    })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    expand: string[];
}

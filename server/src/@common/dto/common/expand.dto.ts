import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExpandQueryDto {
    @ApiPropertyOptional({
        name: 'expand',
        type: String
    })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    expand: string[];
}

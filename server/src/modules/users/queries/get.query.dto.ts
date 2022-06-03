import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UsersGetQuery {
    @ApiPropertyOptional({
        name: 'expand',
        type: String,
        description: 'Expand by profile or userStats (comma-separated)',
        example: 'profile,userStats'
    })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    expand: string[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
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

    @ApiPropertyOptional({
        name: 'mapRank',
        type: String,
        description: "Include the user's rank and run for a map with mapID mapRank"
    })
    @IsOptional()
    @Transform(() => Number)
    @IsInt()
    mapRank: number;
}

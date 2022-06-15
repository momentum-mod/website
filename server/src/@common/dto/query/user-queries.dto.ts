import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination.dto';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ActivitiesGetQuery } from './activity-queries.dto';

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
    @Type(() => Number)
    @IsInt()
    mapRank: number;
}

export class UsersGetAllQuery extends PaginationQueryDto {
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
        name: 'search',
        type: String,
        description: 'User alias to search for',
        example: 'Ron Weasley'
    })
    @IsOptional()
    @IsString()
    search: string;

    @ApiPropertyOptional({
        name: 'playerID',
        type: String,
        description: 'Include only this user (Steam Community ID)',
        example: '123135674'
    })
    @IsOptional()
    @IsSteamCommunityID()
    playerID: string;

    @ApiPropertyOptional({
        name: 'playerIDs',
        type: String,
        description: 'Include only these users (Steam Community IDs, comma-separated)',
        example: '123135674,7987347263,98312287631'
    })
    @IsOptional()
    @IsSteamCommunityID({ each: true })
    @Transform(({ value }) => value.split(','))
    playerIDs: string[];

    @ApiPropertyOptional({
        name: 'mapRank',
        type: String,
        description: 'Include the rank and run for a map with mapID mapRank for all users',
        example: '4'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    mapRank: number;
}

export class UsersGetActivitiesQuery extends OmitType(ActivitiesGetQuery, ['userID' as const]) {}

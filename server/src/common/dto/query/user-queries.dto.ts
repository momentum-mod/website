import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQuery } from './pagination.dto';
import { IsSteamCommunityID } from '../../validators/is-steam-id.validator';
import { ActivitiesGetQuery } from './activity-queries.dto';
import { ExpandQueryDecorators } from '@lib/dto.lib';

export class UsersGetQuery {
    @ExpandQueryDecorators(['profile', 'userStats'])
    expand: string[];

    @ApiPropertyOptional({
        name: 'mapRank',
        type: Number,
        description: "Include the user's rank and run for a map with mapID mapRank"
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    mapRank: number;
}

export class UsersGetAllQuery extends PaginationQuery {
    @ExpandQueryDecorators(['profile', 'userStats'])
    expand: string[];

    @ApiPropertyOptional({
        name: 'search',
        type: String,
        description: 'Filter by partial user alias match',
        example: 'Ron Weasley'
    })
    @IsOptional()
    @IsString()
    search: string;

    @ApiPropertyOptional({
        name: 'userID',
        type: String,
        description: 'Filter by Steam Community ID',
        example: '123135674'
    })
    @IsOptional()
    @IsSteamCommunityID()
    steamID: string;

    @ApiPropertyOptional({
        name: 'userIDs',
        type: String,
        description: 'Filter by CSV list of Steam Community IDs',
        example: '123135674,7987347263,98312287631'
    })
    @IsOptional()
    @IsSteamCommunityID({ each: true })
    @Transform(({ value }) => value.split(','))
    steamIDs: string[];

    @ApiPropertyOptional({
        name: 'mapRank',
        type: Number,
        description: 'Include the rank and run for a map with mapID mapRank for all users',
        example: '4'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    mapRank: number;
}

export class UsersGetActivitiesQuery extends OmitType(ActivitiesGetQuery, ['userID' as const]) {}

class UserMapsBaseGetQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'search',
        type: String,
        description: 'Filter by partial map name match',
        example: 'surf_ronweasley2'
    })
    @IsOptional()
    @IsString()
    search: string;
}

export class UserMapLibraryGetQuery extends UserMapsBaseGetQuery {
    @ExpandQueryDecorators(['submitter', 'thumbnail', 'inFavorites'])
    expand: string[];
}

export class UserMapFavoritesGetQuery extends UserMapsBaseGetQuery {
    @ExpandQueryDecorators(['submitter', 'thumbnail', 'inFavorites'])
    expand: string[];
}

export class UserMapSubmittedGetQuery extends UserMapsBaseGetQuery {
    @ExpandQueryDecorators(['info', 'submitter', 'credits'])
    expand: string[];
}

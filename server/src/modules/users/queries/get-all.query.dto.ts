import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsSteamCommunityID } from '../../../@common/validators/is-steam-id.validator';
import { PaginationQueryDto } from '../../../@common/dto/common/pagination.dto';

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
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        name: 'playerID',
        type: String,
        description: 'Include only this user (Steam Community ID)',
        example: '123135674'
    })
    @IsSteamCommunityID()
    @IsOptional()
    playerID: string;

    @ApiPropertyOptional({
        name: 'playerIDs',
        type: String,
        description: 'Include only these users (Steam Community IDs, comma-separated)',
        example: '123135674,7987347263,98312287631'
    })
    @IsSteamCommunityID({ each: true })
    @IsOptional()
    @Transform(({ value }) => value.split(','))
    playerIDs: string[];

    @ApiPropertyOptional({
        name: 'mapRank',
        type: String,
        description: "TODO: I don't know what the fuck this is.",
        example: '???????'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    mapRank: number;
}

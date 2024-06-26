import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  UserMapFavoritesGetExpand,
  UserMapFavoritesGetQuery,
  UsersGetActivitiesQuery,
  UsersGetAllExpand,
  UsersGetAllQuery,
  UsersGetCreditsExpand,
  UsersGetCreditsQuery,
  UsersGetExpand,
  UsersGetQuery
} from '@momentum/constants';
import { ActivityType } from '@momentum/constants';
import {
  BigIntQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty
} from '../decorators';
import { IsBigInt } from '../../validators';
import { PagedQueryDto } from './pagination.dto';
import { QueryDto } from './query.dto';

export class UsersGetQueryDto extends QueryDto implements UsersGetQuery {
  @ExpandQueryProperty(['profile', 'userStats'])
  readonly expand?: UsersGetExpand;

  @ApiPropertyOptional({
    name: 'mapRank',
    type: Number,
    description: "Include the user's rank and run for a map with mapID mapRank"
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  readonly mapRank?: number;
}

export class UsersGetAllQueryDto
  extends PagedQueryDto
  implements UsersGetAllQuery
{
  @ExpandQueryProperty(['profile', 'userStats'])
  readonly expand?: UsersGetAllExpand;

  @ApiPropertyOptional({
    name: 'search',
    type: String,
    description: 'Filter by partial user alias match',
    example: 'Ron Weasley'
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @BigIntQueryProperty({
    description: 'Filter by Steam Community ID',
    example: '123135674'
  })
  @IsBigInt()
  @IsOptional()
  readonly steamID?: string;

  @IntCsvQueryProperty({
    description: 'Filter by CSV list of Steam Community IDs',
    example: '123135674,7987347263,98312287631',
    bigint: true
  })
  @IsBigInt({ each: true })
  @IsOptional()
  readonly steamIDs?: string[];

  @IntCsvQueryProperty({
    description: 'Filter by CSV list of user IDs',
    example: '123135674,7987347263,98312287631',
    bigint: false
  })
  @IsOptional()
  readonly userIDs?: number[];

  @ApiPropertyOptional({
    name: 'mapRank',
    type: Number,
    description:
      'Include the rank and run for a map with mapID mapRank for all users',
    example: '4'
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  readonly mapRank?: number;
}

export class UsersGetActivitiesQueryDto
  extends PagedQueryDto
  implements UsersGetActivitiesQuery
{
  @IntQueryProperty({ description: 'Filter by user ID' })
  readonly userID: number;

  @EnumQueryProperty(ActivityType, {
    description: 'Types of activities to include'
  })
  readonly type: ActivityType;

  @IntQueryProperty({
    description: 'The ID into the table of the corresponding activity'
  })
  readonly data: number;
}

export class UsersGetCreditsQueryDto
  extends PagedQueryDto
  implements UsersGetCreditsQuery
{
  @ExpandQueryProperty(['map', 'info'])
  expand: UsersGetCreditsExpand;
}

class UserMapsBaseGetQuery extends PagedQueryDto {
  @ApiPropertyOptional({
    name: 'search',
    type: String,
    description: 'Filter by partial map name match',
    example: 'surf_ronweasley2'
  })
  @IsString()
  @IsOptional()
  readonly search: string;
}

export class UserMapFavoritesGetQueryDto
  extends UserMapsBaseGetQuery
  implements UserMapFavoritesGetQuery
{
  @ExpandQueryProperty([
    'info',
    'credits',
    'thumbnail',
    'submitter',
    'personalBest'
  ])
  readonly expand: UserMapFavoritesGetExpand;
}

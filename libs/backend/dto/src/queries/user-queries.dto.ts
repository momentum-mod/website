import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PagedQueryDto } from './pagination.dto';
import {
  BigIntQueryProperty,
  EnumQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty,
  IntQueryProperty
} from '../decorators';
import { IsBigintValidator } from '@momentum/backend/validators';
import {
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery,
  UsersGetActivitiesQuery,
  UsersGetAllQuery,
  UsersGetQuery
} from '@momentum/types';
import { QueryDto } from './query.dto';
import { ActivityType } from '@momentum/constants';

export class UsersGetQueryDto extends QueryDto implements UsersGetQuery {
  @ExpandQueryProperty(['profile', 'userStats'])
  readonly expand?: string[];

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
  readonly expand?: string[];

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
  @IsBigintValidator()
  @IsOptional()
  readonly steamID?: string;

  @IntCsvQueryProperty({
    description: 'Filter by CSV list of Steam Community IDs',
    example: '123135674,7987347263,98312287631',
    bigint: true
  })
  @IsBigintValidator({ each: true })
  @IsOptional()
  readonly steamIDs: string[];

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
  readonly mapRank: number;
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

export class UserMapLibraryGetQueryDto
  extends UserMapsBaseGetQuery
  implements UserMapLibraryGetQuery
{
  @ExpandQueryProperty(['submitter', 'thumbnail', 'inFavorites'])
  readonly expand: string[];
}

export class UserMapFavoritesGetQueryDto
  extends UserMapsBaseGetQuery
  implements UserMapFavoritesGetQuery
{
  @ExpandQueryProperty(['submitter', 'thumbnail', 'inFavorites'])
  readonly expand: string[];
}

export class UserMapSubmittedGetQueryDto
  extends UserMapsBaseGetQuery
  implements UserMapSubmittedGetQuery
{
  @ExpandQueryProperty(['info', 'submitter', 'credits'])
  readonly expand: string[];
}

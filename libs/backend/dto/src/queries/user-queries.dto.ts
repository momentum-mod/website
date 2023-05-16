import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination.dto';
import { ActivitiesGetQueryDto } from './activity-queries.dto';
import {
  BigIntQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty
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

export class UsersGetQueryDto implements UsersGetQuery {
  @ExpandQueryProperty(['profile', 'userStats'])
  readonly expand: string[];

  @ApiPropertyOptional({
    name: 'mapRank',
    type: Number,
    description: "Include the user's rank and run for a map with mapID mapRank"
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  readonly mapRank: number;
}

export class UsersGetAllQueryDto
  extends PaginationQueryDto
  implements UsersGetAllQuery
{
  @ExpandQueryProperty(['profile', 'userStats'])
  readonly expand: string[];

  @ApiPropertyOptional({
    name: 'search',
    type: String,
    description: 'Filter by partial user alias match',
    example: 'Ron Weasley'
  })
  @IsOptional()
  @IsString()
  readonly search: string;

  @BigIntQueryProperty({
    description: 'Filter by Steam Community ID',
    example: '123135674'
  })
  @IsBigintValidator()
  @IsOptional()
  readonly steamID: bigint;

  @IntCsvQueryProperty({
    description: 'Filter by CSV list of Steam Community IDs',
    example: '123135674,7987347263,98312287631',
    bigint: true
  })
  @IsBigintValidator({ each: true })
  @IsOptional()
  readonly steamIDs: bigint[];

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
  extends OmitType(ActivitiesGetQueryDto, ['userID' as const])
  implements UsersGetActivitiesQuery {}

class UserMapsBaseGetQuery extends PaginationQueryDto {
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

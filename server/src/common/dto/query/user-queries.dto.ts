import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQuery } from './pagination.dto';
import { ActivitiesGetQuery } from './activity-queries.dto';
import {
  BigIntQueryProperty,
  ExpandQueryProperty,
  IntCsvQueryProperty
} from '@lib/dto.lib';
import { IsBigInt } from '@common/validators/is-bigint';

export class UsersGetQuery {
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

export class UsersGetAllQuery extends PaginationQuery {
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
  @IsBigInt()
  @IsOptional()
  readonly steamID: bigint;

  @IntCsvQueryProperty({
    description: 'Filter by CSV list of Steam Community IDs',
    example: '123135674,7987347263,98312287631',
    bigint: true
  })
  @IsBigInt({ each: true })
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

export class UsersGetActivitiesQuery extends OmitType(ActivitiesGetQuery, [
  'userID' as const
]) {}

class UserMapsBaseGetQuery extends PaginationQuery {
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

export class UserMapLibraryGetQuery extends UserMapsBaseGetQuery {
  @ExpandQueryProperty(['submitter', 'thumbnail', 'inFavorites'])
  readonly expand: string[];
}

export class UserMapFavoritesGetQuery extends UserMapsBaseGetQuery {
  @ExpandQueryProperty(['submitter', 'thumbnail', 'inFavorites'])
  readonly expand: string[];
}

export class UserMapSubmittedGetQuery extends UserMapsBaseGetQuery {
  @ExpandQueryProperty(['info', 'submitter', 'credits'])
  readonly expand: string[];
}

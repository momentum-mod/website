import { IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { UserDto } from '../user/user.dto';
import { Exclude, Expose } from 'class-transformer';
import { MapDto } from './map.dto';
import { MapReviewSuggestionsDto } from './map-review-suggestions.dto';
import { MapReviewEditDto } from './map-review-edit.dto';

export class MapReviewCommentDto {
  @IdProperty()
  readonly id: number;

  @IsString()
  readonly text: string;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class MapReviewDto {
  @IdProperty()
  readonly id: number;

  @IsString()
  readonly mainText: string;

  @NestedProperty(MapReviewCommentDto, { lazy: true, required: true })
  readonly comments: MapReviewCommentDto[];

  @NestedProperty(MapReviewSuggestionsDto, { lazy: true, required: true })
  readonly suggestions: MapReviewSuggestionsDto;

  @NestedProperty(MapReviewEditDto, { lazy: true })
  readonly editHistory?: MapReviewEditDto[];

  @NestedProperty(MapDto, { lazy: true, required: true })
  @Expose()
  get map(): MapDto {
    return this.mmap;
  }

  @Exclude()
  readonly mmap: MapDto;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(UserDto, { lazy: true, required: true })
  readonly reviewer: UserDto;

  @IdProperty()
  readonly reviewerID: number;

  @IsBoolean()
  readonly resolved: boolean;

  @NestedProperty(UserDto, { lazy: true })
  readonly resolver?: UserDto;

  @IdProperty()
  @IsOptional()
  readonly resolverID?: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

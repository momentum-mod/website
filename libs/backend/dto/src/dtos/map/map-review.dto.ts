import { IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { UserDto } from '../user/user.dto';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { MapDto } from './map.dto';
import { MapReviewEditDto } from './map-review-edit.dto';
import { MapReviewCommentDto } from './map-review-comment.dto';
import { MapReviewSuggestionDto } from './map-review-suggestions.dto';

export class MapReviewDto {
  @IdProperty()
  readonly id: number;

  @IsString()
  readonly mainText: string;

  @NestedProperty(MapReviewCommentDto, {
    lazy: true,
    required: true,
    isArray: true
  })
  readonly comments: MapReviewCommentDto[];

  @NestedProperty(MapReviewSuggestionDto, {
    lazy: true,
    required: true,
    isArray: true
  })
  readonly suggestions: MapReviewSuggestionDto[];

  @NestedProperty(MapReviewEditDto, { lazy: true, isArray: true })
  readonly editHistory?: MapReviewEditDto[];

  @NestedProperty(MapDto, { lazy: true, required: true })
  @Expose()
  get map(): MapDto {
    return plainToInstance(MapDto, this.mmap);
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

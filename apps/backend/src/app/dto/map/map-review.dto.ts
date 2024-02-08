import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { Exclude, Expose, plainToInstance } from 'class-transformer';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';
import { UserDto } from '../user/user.dto';
import { MapDto } from './map.dto';
import { MapReviewEditDto } from './map-review-edit.dto';
import { MapReviewCommentDto } from './map-review-comment.dto';
import { MapReviewSuggestionDto } from './map-review-suggestions.dto';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import {
  MapReview,
} from '@momentum/constants';
import { Config } from '../../config';

const ENDPOINT_URL = Config.storage.endpointUrl;
const BUCKET = Config.storage.bucketName;

export class MapReviewDto implements MapReview {
  @IdProperty()
  readonly id: number;

  @IsString()
  readonly mainText: string;

  @NestedProperty(MapReviewCommentDto, {
    lazy: true,
    required: false,
    isArray: true
  })
  readonly comments: MapReviewCommentDto[];

  @IsInt()
  @IsOptional()
  numComments: number;

  @NestedProperty(MapReviewSuggestionDto, {
    lazy: true,
    required: false,
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

  @Exclude()
  readonly imageIDs: string[];

  @Expose()
  get images(): string[] {
    return this.imageIDs.map(
      (id) => `${ENDPOINT_URL}/${BUCKET}/${mapReviewAssetPath(id.toString())}`
    );
  }

  @NestedProperty(UserDto, { lazy: true, required: true })
  readonly reviewer: UserDto;

  @IdProperty()
  readonly reviewerID: number;

  @IsBoolean()
  @IsOptional()
  readonly resolved: boolean | null;

  @NestedProperty(UserDto, { lazy: true })
  readonly resolver?: UserDto;

  @IdProperty()
  @IsOptional()
  readonly resolverID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

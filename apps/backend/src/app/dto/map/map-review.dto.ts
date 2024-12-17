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
  AdminUpdateMapReview,
  CreateMapReview,
  CreateMapReviewWithFiles,
  DateString,
  MapReview,
  mapReviewAssetPath,
  UpdateMapReview
} from '@momentum/constants';
import { Config } from '../../config';

const CDN_URL = Config.url.cdn;

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
  readonly editHistory: MapReviewEditDto[];

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
      (id) => `${CDN_URL}/${mapReviewAssetPath(id.toString())}`
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
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}

export class CreateMapReviewDto
  extends PickType(MapReviewDto, ['mainText', 'suggestions'] as const)
  implements CreateMapReview
{
  @ApiProperty({
    description:
      'Whether the review needs resolving to pass to FINAL_APPROVAL. Only accessible to Reviewers, Mods and Admins'
  })
  @IsBoolean()
  @IsOptional()
  readonly needsResolving?: boolean;
}

export class CreateMapReviewWithFilesDto implements CreateMapReviewWithFiles {
  @ApiProperty({
    type: 'array',
    format: 'binary',
    description: 'Array of image files'
  })
  @IsOptional()
  readonly images: any[];

  @NestedProperty(CreateMapReviewDto, {
    description: 'The JSON part of the body'
  })
  readonly data: CreateMapReviewDto;
}

export class UpdateMapReviewDto
  extends PartialType(CreateMapReviewDto)
  implements UpdateMapReview
{
  @ApiProperty({ description: 'Update the resolved state' })
  @IsBoolean()
  @IsOptional()
  readonly resolved?: boolean | null;
}

export class AdminUpdateMapReviewDto
  extends PickType(UpdateMapReviewDto, ['resolved'] as const)
  implements AdminUpdateMapReview {}

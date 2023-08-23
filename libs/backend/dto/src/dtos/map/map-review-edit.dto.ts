import { MapReviewEdit } from '@momentum/constants';
import { IsString } from 'class-validator';
import { CreatedAtProperty } from '../../decorators';

export class MapReviewEditDto implements MapReviewEdit {
  @IsString()
  readonly mainText: string;

  @CreatedAtProperty()
  readonly createdAt: Date;
}

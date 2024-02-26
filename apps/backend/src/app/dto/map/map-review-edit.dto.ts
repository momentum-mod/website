import { DateString, MapReviewEdit } from '@momentum/constants';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreatedAtProperty, IdProperty } from '../decorators';

export class MapReviewEditDto implements MapReviewEdit {
  @IsString()
  @IsOptional()
  readonly mainText: string;

  @CreatedAtProperty()
  readonly date: DateString;

  @IdProperty()
  editorID: number;

  @IsBoolean()
  @IsOptional()
  resolved: boolean | null;
}

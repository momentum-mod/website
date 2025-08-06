import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  MAX_USER_ALIAS_LENGTH,
  MapSubmissionPlaceholder
} from '@momentum/constants';
import { JsonValue } from 'type-fest';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MapCreditDto } from './map-credit.dto';

export class MapSubmissionPlaceholderDto
  extends PickType(MapCreditDto, ['type', 'description'] as const)
  implements MapSubmissionPlaceholder
{
  [k: string]: JsonValue;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_USER_ALIAS_LENGTH)
  readonly alias: string;
}

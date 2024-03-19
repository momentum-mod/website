import { ApiProperty, PickType } from '@nestjs/swagger';
import { MapSubmissionPlaceholder } from '@momentum/constants';
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
  @MinLength(3)
  @MaxLength(32)
  readonly alias: string;
}

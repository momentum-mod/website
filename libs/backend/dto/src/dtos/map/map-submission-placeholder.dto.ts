import { ApiProperty, PickType } from '@nestjs/swagger';
import { MapCreditDto } from './map-credit.dto';
import { MapSubmissionPlaceholder } from '@momentum/constants';
import { JsonValue } from 'type-fest';
import { IsString, MaxLength } from 'class-validator';

export class MapSubmissionPlaceholderDto
  extends PickType(MapCreditDto, ['type', 'description'] as const)
  implements MapSubmissionPlaceholder
{
  [k: string]: JsonValue;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  readonly alias: string;
}

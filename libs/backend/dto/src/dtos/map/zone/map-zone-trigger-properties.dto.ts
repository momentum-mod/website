import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MapZoneTriggerProperties } from '@momentum/constants';
import { IsDefined } from 'class-validator';
import { Prisma } from '@prisma/client';

// Apparently there's some reason for this stupid table to exist, I can't
// remember what Goc said though Think it's changing for 0.10 anyway ╚(•⌂•)╝
export class MapZoneTriggerPropertiesDto implements MapZoneTriggerProperties {
  @Exclude()
  readonly id: number;

  @ApiProperty()
  @IsDefined()
  readonly properties: Prisma.JsonValue;

  @Exclude()
  readonly triggerID: number;

  @Exclude()
  readonly createdAt: Date;

  @Exclude()
  readonly updatedAt: Date;
}

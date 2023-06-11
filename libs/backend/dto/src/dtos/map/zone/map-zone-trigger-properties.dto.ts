import { Prisma } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsJSON } from 'class-validator';
import { MapZoneTriggerProperties } from '@momentum/types';

// Apparently there's some reason for this stupid table to exist, I can't
// remember what Goc said though Think it's changing for 0.10 anyway ╚(•⌂•)╝
export class MapZoneTriggerPropertiesDto implements MapZoneTriggerProperties {
  @Exclude()
  readonly id: number;

  @ApiProperty()
  @IsJSON()
  readonly properties: Prisma.JsonValue;

  @Exclude()
  readonly triggerID: number;

  @Exclude()
  readonly createdAt: Date;

  @Exclude()
  readonly updatedAt: Date;
}

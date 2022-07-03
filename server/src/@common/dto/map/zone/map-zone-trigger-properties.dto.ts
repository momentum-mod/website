import { MapZoneTriggerProperties, Prisma } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsJSON } from 'class-validator';

// Apparently there's some reason for this stupid table to exist, I can't remember what Goc said though
// Think it's changing for 0.10 anyway ╚(•⌂•)╝
export class MapZoneTriggerPropertiesDto implements MapZoneTriggerProperties {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsJSON()
    properties: Prisma.JsonValue;

    @Exclude()
    triggerID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

import { MapZoneStats } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { BaseStatsDto } from '../../stats/base-stats.dto';
import { NestedDto } from '@lib/dto.lib';

export class MapZoneStatsDto implements PrismaModelToDto<MapZoneStats> {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsInt()
    completions: number;

    @ApiProperty()
    @IsInt()
    uniqueCompletions: number;

    @Exclude()
    zoneID: number;

    @Exclude()
    baseStatsID: number;

    @NestedDto(BaseStatsDto, { required: false })
    baseStats?: BaseStatsDto;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

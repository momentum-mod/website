import { MapZoneStats } from '@prisma/client';
import { Exclude, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, ValidateNested } from 'class-validator';
import { BaseStatsDto } from '../../stats/base-stats.dto';
import { DtoFactory } from '@lib/dto.lib';

export class MapZoneStatsDto implements MapZoneStats {
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
    baseStatsID: bigint;

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(BaseStatsDto, x)))
    @ValidateNested()
    baseStats: BaseStatsDto;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

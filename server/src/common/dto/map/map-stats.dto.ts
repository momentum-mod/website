import { MapStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsPositive } from 'class-validator';
import { Exclude } from 'class-transformer';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class MapStatsDto implements PrismaModelToDto<MapStats, 'timePlayed'> {
    @ApiProperty()
    @IsPositive()
    readonly id: number;

    @Exclude()
    readonly mapID: number;

    @ApiProperty()
    @IsInt()
    readonly reviews: number;

    @ApiProperty()
    @IsInt()
    readonly downloads: number;

    @ApiProperty()
    @IsInt()
    readonly subscriptions: number;

    @ApiProperty()
    @IsInt()
    readonly plays: number;

    @ApiProperty()
    @IsInt()
    readonly favorites: number;

    @ApiProperty()
    @IsInt()
    readonly completions: number;

    @ApiProperty()
    @IsInt()
    readonly uniqueCompletions: number;

    @ApiProperty({ description: 'The total time played on the map', type: String })
    @IsNumberString()
    readonly timePlayed: bigint;

    @IdProperty({ bigint: true })
    readonly baseStatsID: number;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

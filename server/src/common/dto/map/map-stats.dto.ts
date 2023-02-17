import { MapStats } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsPositive } from 'class-validator';
import { Exclude } from 'class-transformer';
import { CreatedAtProperty, IdProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';

export class MapStatsDto implements PrismaModelToDto<MapStats, 'timePlayed'> {
    @ApiProperty()
    @IsPositive()
    id: number;

    @Exclude()
    mapID: number;

    @ApiProperty()
    @IsInt()
    reviews: number;

    @ApiProperty()
    @IsInt()
    downloads: number;

    @ApiProperty()
    @IsInt()
    subscriptions: number;

    @ApiProperty()
    @IsInt()
    plays: number;

    @ApiProperty()
    @IsInt()
    favorites: number;

    @ApiProperty()
    @IsInt()
    completions: number;

    @ApiProperty()
    @IsInt()
    uniqueCompletions: number;

    @ApiProperty({ description: 'The total time played on the map', type: String })
    @IsNumberString()
    timePlayed: bigint;

    @IdProperty({ bigint: true })
    baseStatsID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

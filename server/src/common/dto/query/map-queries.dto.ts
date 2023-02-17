import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MapStatus, MapType } from '../../enums/map.enum';
import { ExpandQueryDecorators, SkipQuery, TakeQuery } from '@lib/dto.lib';

class MapsGetAllBaseQuery {
    @SkipQueryProperty(0)
    skip = 0;

    @TakeQueryProperty(100)
    take = 100;

    @StringQueryProperty({ description: 'Filter by partial map name match', example: 'de_dust2' })
    search: string;

    @IntQueryProperty({ description: 'Filter by submitter ID' })
    submitterID: number;
}

export class AdminCtlMapsGetAllQuery extends MapsGetAllBaseQuery {
    @ExpandQueryProperty(['info', 'submitter', 'credits'])
    expand: string[];

    @EnumQueryProperty(MapStatus, { description: 'Filter by map status flags' })
    status: MapStatus;

    @BooleanQueryProperty({ description: 'Filter by priority or non-priority' })
    priority: boolean;
}

export class MapsCtlGetAllQuery extends MapsGetAllBaseQuery {
    @ExpandQueryProperty([
        'info',
        'submitter',
        'credits',
        'thumbnail',
        'inFavorites',
        'inLibrary',
        'personalBest',
        'worldRecord'
    ])
    expand: string[];

    @EnumQueryProperty(MapType, { description: 'Filter by map type (gamemode)' })
    type: MapType;

    @IntQueryProperty({ description: 'Filter by tier (lower bound)' })
    difficultyLow: number;

    @IntQueryProperty({ description: 'Filter by tier (upper bound)' })
    difficultyHigh: number;

    @BooleanQueryProperty({ description: 'Filter by linear or staged' })
    isLinear: boolean;
}

export class MapsGetQuery {
    @ExpandQueryProperty([
        'info',
        'credits',
        'submitter',
        'images',
        'thumbnail',
        'stats',
        'inFavorites',
        'inLibrary',
        'personalBest',
        'worldRecord',
        'tracks'
    ])
    expand: string[];
}

export class MapCreditsGetQuery {
    @ExpandQueryProperty(['user'])
    expand: string[];
}

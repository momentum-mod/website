import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MapStatus, MapType } from '../../enums/map.enum';
import { ExpandQueryDecorators, SkipQueryDecorators, TakeQueryDecorators } from '../../utils/dto.utility';

class MapsGetAllBaseQuery {
    @SkipQueryDecorators(0)
    skip = 0;

    @TakeQueryDecorators(100)
    take = 100;

    @ApiPropertyOptional({
        name: 'search',
        type: String,
        description: 'Filter by partial map name match',
        example: 'de_dust2'
    })
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        name: 'submitterID',
        type: Number,
        description: 'Filter by submitter ID'
    })
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    submitterID: number;
}

export class AdminCtlMapsGetAllQuery extends MapsGetAllBaseQuery {
    @ExpandQueryDecorators(['info', 'submitter', 'credits'])
    expand: string[];

    @ApiPropertyOptional({
        name: 'status',
        enum: MapStatus,
        type: Number,
        description: 'Filter by map status flags'
    })
    @IsOptional()
    @Type(() => Number)
    @IsEnum(MapStatus)
    status: MapStatus;

    @ApiPropertyOptional({
        name: 'priority',
        type: Boolean,
        description: 'Filter by priority or non-priority'
    })
    @IsOptional()
    @Type(() => Boolean) // TODO: Check this actually works!! Might run into some JS weirdness - Tom
    priority: boolean;
}

export class MapsCtlGetAllQuery extends MapsGetAllBaseQuery {
    @ExpandQueryDecorators([
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

    @ApiPropertyOptional({
        name: 'type',
        enum: MapType,
        type: Number,
        description: 'Filter by map type (gamemode)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsEnum(MapType)
    type: MapType;

    @ApiPropertyOptional({
        name: 'difficultyLow',
        type: Number,
        description: 'Filter by tier (lower bound)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    difficultyLow: number;

    @ApiPropertyOptional({
        name: 'difficultyHigh',
        type: Number,
        description: 'Filter by tier (upper bound)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    difficultyHigh: number;

    @ApiPropertyOptional({
        name: 'isLinear',
        type: Boolean,
        description: 'Filter by linear or staged'
    })
    @IsOptional()
    @Type(() => Boolean)
    isLinear: boolean;
}

export class MapsGetQuery {
    @ExpandQueryDecorators([
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
    @ExpandQueryDecorators(['user'])
    expand: string[];
}

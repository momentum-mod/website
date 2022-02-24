import { ApiProperty } from '@nestjs/swagger';
import { EMapTriggerType, EMapType } from '../../enums/map.enum';
import { MapCreditDto } from './mapCredit.dto';

class mapTriggers {
    @ApiProperty()
    type: EMapTriggerType;
    @ApiProperty()
    pointsHeight: number;
    @ApiProperty()
    pointsZPos: number;
    @ApiProperty()
    points: number;
    @ApiProperty()
    zoneProps: number;
}

class mapZone {
    @ApiProperty()
    zoneNum: number;
    @ApiProperty()
    triggers: mapTriggers[];
    @ApiProperty()
    stats: {
        baseStats: any; // TODO: create Type
    };
}
class mapInfo {
    @ApiProperty()
    description: string;
    @ApiProperty()
    youtubeID: string;
    @ApiProperty()
    numTracks: number;
    @ApiProperty()
    creationDate: Date;
}

class mapTracks {
    @ApiProperty()
    trackNum: number;
    @ApiProperty()
    isLinear: boolean;
    @ApiProperty()
    numZones: number;
    @ApiProperty()
    difficulty: number;
    @ApiProperty()
    zones: mapZone[];
    @ApiProperty()
    stats: {
        baseStats: any;
    };
}

export class CreateMapDto {
    @ApiProperty()
    name: string;
    @ApiProperty()
    type: EMapType;
    @ApiProperty()
    info: mapInfo;
    @ApiProperty()
    tracks: mapTracks[];
    @ApiProperty()
    stats: {
        baseStats: any; // TODO: create Type
    };
    @ApiProperty()
    credits: MapCreditDto[];
}

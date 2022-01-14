import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/mapRank.dto';

export interface RunDto {
    id: number;
    time: number;
    trackNum: number;
    zoneNum: number;
    ticks: number;
    tickRate: number;
    flags: number;
    file: string;
    hash:  string;
    createdAt: date;
    updatedAt: date;
    mapID: number;
    playerID: number;
    baseStatsID: number;
}

export interface UserRunDto extends RunDto {    
    user: UserDto;     
    rank: MapRankDto;
}

import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/mapRank.dto';
import { MapRank, Run, User } from '@prisma/client';

export class RunDto {
    id: number;
    time: number;
    trackNum: number;
    zoneNum: number;
    ticks: number;
    tickRate: number;
    flags: number;
    file: string;
    hash: string;
    createdAt: Date;
    updatedAt: Date;
    mapID: number;
    playerID: number;
    baseStatsID: number;

    constructor(_run: Run) {
        if (_run == null) {
            return;
        }

        this.id = +_run.id.toString();
        // this.time = +(_run.time.toString());
        this.trackNum = _run.trackNum;
        this.zoneNum = _run.zoneNum;
        this.ticks = _run.ticks;
        this.tickRate = _run.tickRate;
        this.flags = _run.flags;
        this.file = _run.file;
        this.hash = _run.hash;
        this.createdAt = _run.createdAt;
        this.updatedAt = _run.updatedAt;
        this.mapID = _run.mapID;
        this.playerID = _run.playerID;
        this.baseStatsID = +_run.baseStatsID.toString();
    }
}

export class UserRunDto extends RunDto {
    user: UserDto;
    rank: MapRankDto;

    constructor(_run: Run, _user: User, _rank: MapRank) {
        super(_run);
        this.user = new UserDto(_user);
        this.rank = new MapRankDto(_rank);
    }
}

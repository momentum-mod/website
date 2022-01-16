import { MapRank } from "@prisma/client";

export class MapRankDto implements MapRank{
    mapID: number;
    userID: number;
    gameType: number;
    flags: number;
    trackNum: number;
    zoneNum: number;
    runID: bigint;
    rank: number;
    rankXP: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(_rank: MapRank) {
        if(_rank == null) { return; }
        
        this.mapID = _rank.mapID;
        this.userID = _rank.userID;
        this.gameType = _rank.gameType;
        this.flags = _rank.flags;
        this.trackNum = _rank.trackNum;
        this.zoneNum = _rank.zoneNum;
        this.rank = _rank.rank;
        this.rankXP = _rank.rankXP;
        this.createdAt = _rank.createdAt;
        this.updatedAt = _rank.updatedAt;
    }
}

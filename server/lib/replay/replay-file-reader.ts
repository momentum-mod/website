import {
    BaseStatsFromGame,
    ReplayHeader,
    RunFrame,
    ZoneStatsFromGame
} from '@modules/session/run/run-session.interfaces';

/**
 * Utility class for reading Momentum Replay Files (.mrf)
 */
export class ReplayFileReader {
    buffer: Buffer;
    offset: number;
    isOK: boolean;

    constructor(buffer: Buffer) {
        this.buffer = buffer;
        this.offset = 0;
        this.isOK = true;
    }

    readHeader(): ReplayHeader {
        return {
            magic: this.readInt32(),
            version: this.readInt8(),
            header: {
                mapName: this.readString(),
                mapHash: this.readString(),
                playerName: this.readString(),
                steamID: this.readString(),
                tickRate: this.readFloat(),
                runFlags: this.readInt32(),
                runDate: this.readString(),
                startTick: this.readInt32(),
                stopTick: this.readInt32(),
                trackNum: this.readInt8(),
                zoneNum: this.readInt8()
            }
        };
    }

    readStats(isStaged: boolean, tickRate: number): [BaseStatsFromGame, ZoneStatsFromGame[]] {
        let overallStats, zoneStats;

        const hasStats = this.readInt8(false);
        const numZones = this.readInt8();

        if (!hasStats || !numZones) throw new ReplayReadError();

        if (isStaged) {
            zoneStats = [];
            for (let i = 0; i < numZones + 1 && this.isOK; i++) {
                if (i === 0) {
                    overallStats = this.readBaseStats(tickRate);
                } else {
                    zoneStats.push({
                        zoneNum: i,
                        baseStats: this.readBaseStats(tickRate)
                    });
                }
            }
        } else if (numZones === 1) {
            overallStats = this.readBaseStats(tickRate);
        } else throw new ReplayReadError();

        return [overallStats, zoneStats];
    }

    readFrames(stopTick: number): RunFrame[] {
        const numFrames = this.readInt32();
        const frames: RunFrame[] = [];

        if (!numFrames || numFrames < stopTick) throw new ReplayReadError();

        for (let i = 0; i < numFrames && this.isOK; i++) {
            frames.push(this.readRunFrame());
        }

        if (!this.isOK) throw new ReplayReadError();

        return frames;
    }

    private readBaseStats(tickrate: number): BaseStatsFromGame {
        return {
            jumps: this.readInt32(),
            strafes: this.readInt32(),
            avgStrafeSync: this.readFloat(),
            avgStrafeSync2: this.readFloat(),
            enterTime: this.readInt32() * tickrate,
            totalTime: this.readInt32() * tickrate,
            velMax3D: this.readFloat(),
            velMax2D: this.readFloat(),
            velAvg3D: this.readFloat(),
            velAvg2D: this.readFloat(),
            velEnter3D: this.readFloat(),
            velEnter2D: this.readFloat(),
            velExit3D: this.readFloat(),
            velExit2D: this.readFloat()
        };
    }

    private readRunFrame(): RunFrame {
        return {
            eyeAngleX: this.readFloat(),
            eyeAngleY: this.readFloat(),
            eyeAngleZ: this.readFloat(),
            posX: this.readFloat(),
            posY: this.readFloat(),
            posZ: this.readFloat(),
            viewOffset: this.readFloat(),
            buttons: this.readInt32()
        };
    }

    private checkBuffer(): boolean {
        const inRange = this.offset < this.buffer.length;

        if (!inRange && this.isOK) {
            this.isOK = false;
        }

        return inRange;
    }

    private readString(): string | undefined {
        if (!this.checkBuffer()) return undefined;

        const endOfStr = this.buffer.indexOf('\0', this.offset, 'ascii');

        if (endOfStr !== -1 && endOfStr < this.buffer.length) {
            const str = this.buffer.toString('ascii', this.offset, endOfStr);
            this.offset = endOfStr + 1;
            return str;
        } else {
            this.isOK = false;
            return undefined;
        }
    }

    private readFloat(): number | undefined {
        if (!this.checkBuffer()) return undefined;
        const val = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return val;
    }

    private readInt32(unsigned = true): number | undefined {
        if (!this.checkBuffer()) return undefined;
        const val = unsigned ? this.buffer.readUInt32LE(this.offset) : this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return val;
    }

    private readInt8(unsigned = true): number | undefined {
        if (!this.checkBuffer()) return undefined;
        const val = unsigned ? this.buffer.readUInt8(this.offset) : this.buffer.readInt8(this.offset);
        this.offset++;
        return val;
    }
}

export class ReplayReadError extends Error {
    constructor() {
        super();
        this.name = 'ReplayReadError';
    }
}

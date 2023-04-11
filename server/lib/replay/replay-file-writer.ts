import { BaseStatsFromGame, Replay, RunFrame } from '@modules/session/run/run-session.interfaces';

/**
 * Utility class for writing Momentum Replay Files (.mrf)
 * Code from writeReplayFile from run-tester.ts could be used in future if needed
 */
export class ReplayFileWriter {
    buffer: Buffer;
    offset: number;

    constructor(bufferSize = 1024) {
        this.buffer = Buffer.alloc(bufferSize);
        this.offset = 0;
    }

    writeHeader(replay: Replay): void {
        this.writeInt32(replay.magic);
        this.writeInt8(replay.version);
        this.writeString(replay.header.mapName);
        this.writeString(replay.header.mapHash);
        this.writeString(replay.header.playerName);
        this.writeString(replay.header.steamID.toString());
        this.writeFloat(replay.header.tickRate);
        this.writeInt32(replay.header.runFlags);
        this.writeString(replay.header.runDate);
        this.writeInt32(replay.header.startTick);
        this.writeInt32(replay.header.stopTick);
        this.writeInt8(replay.header.trackNum);
        this.writeInt8(replay.header.zoneNum);
    }

    writeBaseStats(stats: BaseStatsFromGame, tickrate: number) {
        this.writeInt32(stats.jumps);
        this.writeInt32(stats.strafes);
        this.writeFloat(stats.avgStrafeSync);
        this.writeFloat(stats.avgStrafeSync2);
        this.writeInt32(stats.enterTime / tickrate);
        this.writeInt32(stats.totalTime / tickrate);
        this.writeFloat(stats.velMax3D);
        this.writeFloat(stats.velMax2D);
        this.writeFloat(stats.velAvg3D);
        this.writeFloat(stats.velAvg2D);
        this.writeFloat(stats.velEnter3D);
        this.writeFloat(stats.velEnter2D);
        this.writeFloat(stats.velExit3D);
        this.writeFloat(stats.velExit2D);
    }

    writeRunFrame(frame: RunFrame) {
        this.writeFloat(frame.eyeAngleX);
        this.writeFloat(frame.eyeAngleY);
        this.writeFloat(frame.eyeAngleZ);
        this.writeFloat(frame.posX);
        this.writeFloat(frame.posY);
        this.writeFloat(frame.posZ);
        this.writeFloat(frame.viewOffset);
        this.writeInt32(frame.buttons);
    }

    writeString(str: string) {
        const len = str.length + 1; // +1 for \0
        this.checkBuffer(len);
        this.buffer.write(str + '\0', this.offset, 'ascii');
        this.offset += len;
    }

    writeFloat(val: number) {
        this.checkBuffer();
        this.buffer.writeFloatLE(val, this.offset);
        this.offset += 4;
    }

    writeInt32(val: number, unsigned = true) {
        this.checkBuffer();
        unsigned ? this.buffer.writeUInt32LE(val, this.offset) : this.buffer.writeInt32LE(val, this.offset);
        this.offset += 4;
    }

    writeInt8(val: number, unsigned = true) {
        this.checkBuffer();
        unsigned ? this.buffer.writeUInt8(val, this.offset) : this.buffer.writeInt8(val, this.offset);
        this.offset++;
    }

    checkBuffer(len = 4) {
        if (this.offset > this.buffer.length - len) {
            // This is a very silly way of handling buffer allocation but good enough for tests
            const newBuffer = Buffer.alloc(this.buffer.length * 2);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
        }
    }
}

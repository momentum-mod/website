import * as request from 'supertest';
import { ReplayFileWriter } from '../../src/common/lib/replay-file-writer';
import {
    BaseStatsFromGame,
    Replay,
    RunFrame,
    ZoneStatsFromGame
} from '../../src/modules/session/run/run-session.interface';

const DEFAULT_DELAY_MS = 50; // TODO: Can probably go lower

const MAGIC = 0x524d4f4d;

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const randomPrecision = (min, max, precision) => +parseFloat(Math.random() * (max - min) + min).toPrecision(precision);

export interface RunTesterProps {
    accessToken?: string;
    mapID: number;
    mapName: string;
    mapHash: string;
    steamID: string;
    playerName: string;
    tickRate: number;
    runFlags: number;
    runDate: string;
    trackNum: number;
    zoneNum: number;
    startTick: number;
}

/**
 * Testing utility for creating a replay file in sync with a run run
 * Doesn't currently support ILs, and likely to change a lot in future versions
 */
export class RunTester {
    props: RunTesterProps;

    replay: Replay;
    replayFile: ReplayFileWriter;

    sessionID: number;

    startTime: number;
    startTick: number;
    stopTick: number;

    currZone: number;
    currTime: number;

    constructor(props: RunTesterProps) {
        this.props = props;
        this.props.accessToken ??= global.accessToken;
        this.replayFile = new ReplayFileWriter();

        this.replay = {
            magic: null,
            version: null,
            header: {
                mapName: null,
                mapHash: null,
                playerName: null,
                steamID: null,
                tickRate: null,
                runFlags: null,
                runDate: null,
                startTick: null,
                stopTick: null,
                trackNum: null,
                zoneNum: null
            },
            overallStats: null,
            zoneStats: [],
            frames: []
        };
    }

    static async run(props: RunTesterProps, zones: number, delay = DEFAULT_DELAY_MS) {
        const runTester = new RunTester(props);
        await runTester.startRun();
        await runTester.doZones(zones, delay);
        return runTester.endRun({ delay: delay });
    }

    async doRun(zones: number, delay = DEFAULT_DELAY_MS) {
        await this.startRun();
        await this.doZones(zones, delay);
        return this.endRun({ delay: delay });
    }

    async doZones(zones: number, delay = DEFAULT_DELAY_MS) {
        for (let i = 0; i < zones; i++) await this.doZone(delay);
    }

    async startRun() {
        this.currZone = 0;
        this.startTick = this.props.startTick ?? 0;
        this.startTime = Date.now();

        const res = await request(global.server)
            .post(`/api/v1/session/run`)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .send({ mapID: this.props.mapID, trackNum: this.props.trackNum, zoneNum: 0 })
            .expect(200);
        this.sessionID = res.body.id;
    }

    async doZone(delay = DEFAULT_DELAY_MS) {
        await wait(delay);
        this.currZone++;

        this.currTime = Date.now();

        const timeTotal = Date.now() - this.startTime;
        const tickTotal = Math.ceil(timeTotal / 1000 / this.props.tickRate);

        await request(global.server)
            .post(`/api/v1/session/run/${this.sessionID}`)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .send({ zoneNum: this.currZone, tick: tickTotal })
            .expect(200);

        this.replay.zoneStats.push({
            zoneNum: this.currZone,
            baseStats: RunTester.createStats(
                new Date(),
                this.replay.zoneStats.length > 0 ? this.replay.zoneStats.at(-1).baseStats.totalTime : 0
            )
        });
    }

    async endRun(args?: {
        delay?: number;
        beforeSubmit?: (self: RunTester) => void;
        beforeSave?: (self: RunTester) => void;
        writeStats?: boolean;
        writeFrames?: boolean;
    }): Promise<request.Response> {
        const delay = args?.delay ?? DEFAULT_DELAY_MS;

        await wait(delay);
        const timeTotal = Date.now() - this.startTime;
        this.stopTick = Math.ceil(timeTotal / 1000 / this.props.tickRate);

        this.replay.magic = MAGIC;
        this.replay.version = 1;
        this.replay.header = {
            mapName: this.props.mapName,
            mapHash: this.props.mapHash,
            playerName: this.props.playerName,
            steamID: this.props.steamID,
            tickRate: this.props.tickRate,
            runFlags: this.props.runFlags,
            runDate: this.props.runDate,
            startTick: this.startTick,
            stopTick: this.stopTick,
            trackNum: this.props.trackNum,
            zoneNum: this.props.zoneNum
        };

        const sumField = (fieldName: string): number =>
            this.replay.zoneStats.reduce((r, zs: ZoneStatsFromGame) => r + zs.baseStats[fieldName], 0);

        if (this.replay.zoneStats.length > 0) {
            this.replay.zoneStats.push({
                zoneNum: this.currZone,
                baseStats: RunTester.createStats(new Date(), this.replay.zoneStats.at(-1).baseStats.totalTime)
            });

            this.replay.overallStats = {
                jumps: sumField('jumps'),
                strafes: sumField('strafes'),
                avgStrafeSync: sumField('avgStrafeSync'),
                avgStrafeSync2: sumField('avgStrafeSync2'),
                enterTime: 0,
                totalTime: this.replay.zoneStats.at(-1).baseStats.totalTime,
                velMax3D: sumField('velMax3D'),
                velMax2D: sumField('velMax2D'),
                velAvg3D: sumField('velAvg3D'),
                velAvg2D: sumField('velAvg2D'),
                velEnter3D: sumField('velEnter3D'),
                velEnter2D: sumField('velEnter2D'),
                velExit3D: sumField('velExit3D'),
                velExit2D: sumField('velExit2D')
            };
        } else {
            this.replay.overallStats = RunTester.createStats(new Date(), 0);
        }

        this.replay.frames = Array.from({ length: this.stopTick }, () => RunTester.createFrame());

        // Pass context to callback and execute, allowing tests to manipulate all sorts of nonsense. Gotta love JS!
        args?.beforeSave?.(this);

        this.writeReplayFile(args?.writeStats ?? true, args?.writeFrames ?? true);

        await new Promise((resolve) => setTimeout(resolve, 50));

        args?.beforeSubmit?.(this);

        return request(global.server)
            .post(`/api/v1/session/run/${this.sessionID}/end`)
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .attach('file', this.replayFile.buffer, 'file');
    }

    private writeReplayFile(writeStats = true, writeFrames = true) {
        // Header
        this.replayFile.writeHeader(this.replay);

        // Stats
        if (writeStats) {
            this.replayFile.writeInt8(1, false); // hasStats
            this.replayFile.writeInt8(this.replay.zoneStats.length); // numZones

            // Only testing non-IL for now
            this.replayFile.writeBaseStats(this.replay.overallStats, this.replay.header.tickRate);
            this.replay.zoneStats.forEach((zone) =>
                this.replayFile.writeBaseStats(zone.baseStats, this.replay.header.tickRate)
            );
        }

        if (writeFrames) {
            this.replayFile.writeInt32(this.replay.frames.length);
            // Frames
            this.replay.frames.forEach((frame) => this.replayFile.writeRunFrame(frame));
        }
    }

    private static createStats(startDate: Date, previousTime: number): BaseStatsFromGame {
        const sqrt2 = Math.sqrt(2);
        const sqrt3 = Math.sqrt(3);
        return {
            jumps: randomInt(0, 5),
            strafes: randomInt(0, 5),
            avgStrafeSync: randomRange(70, 90),
            avgStrafeSync2: randomRange(70, 90),
            enterTime: previousTime,
            totalTime: (new Date().getTime() - startDate.getTime()) / 1000,
            velMax3D: randomRange(0, sqrt3 * 3500),
            velMax2D: randomRange(0, sqrt2 * 3500),
            velAvg3D: randomRange(0, sqrt3 * 3500),
            velAvg2D: randomRange(0, sqrt2 * 3500),
            velEnter3D: randomRange(0, sqrt3 * 3500),
            velEnter2D: randomRange(0, sqrt2 * 3500),
            velExit3D: randomRange(0, sqrt3 * 3500),
            velExit2D: randomRange(0, sqrt2 * 3500)
        };
    }

    // We don't actually validate these, this should pass fine.
    private static createFrame(): RunFrame {
        return {
            eyeAngleX: 0,
            eyeAngleY: 0,
            eyeAngleZ: 0,
            posX: 0,
            posZ: 0,
            posY: 0,
            viewOffset: 0,
            buttons: 0
        };
    }
}

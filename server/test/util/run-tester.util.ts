import { ReplayFileWriter } from '@lib/replay/replay-file-writer';
import {
  BaseStatsFromGame,
  Replay,
  RunFrame,
  ZoneStatsFromGame
} from '@modules/session/run/run-session.interfaces';
import { Random } from '@lib/random.lib';
import { ParsedResponse, RequestUtil } from '@test/util/request.util';

const DEFAULT_DELAY_MS = 100;
const MAGIC = 0x524d4f4d;

const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export interface RunTesterProps {
  token?: string;
  mapID: number;
  mapName: string;
  mapHash: string;
  steamID: bigint;
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

  private req: RequestUtil;

  constructor(req: RequestUtil, props: RunTesterProps) {
    this.req = req;
    this.props = props;
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

  static async run(
    req: RequestUtil,
    props: RunTesterProps,
    zones: number,
    delay = DEFAULT_DELAY_MS
  ) {
    const runTester = new RunTester(req, props);
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

    const res = await this.req.post({
      url: 'session/run',
      body: {
        mapID: this.props.mapID,
        trackNum: this.props.trackNum,
        zoneNum: 0
      },
      status: 200,
      token: this.props.token ?? ''
    });
    this.sessionID = res.body.id;
  }

  async doZone(delay = DEFAULT_DELAY_MS) {
    await sleep(delay);
    this.currZone++;

    this.currTime = Date.now();

    const timeTotal = Date.now() - this.startTime;
    const tickTotal = Math.ceil(timeTotal / 1000 / this.props.tickRate);

    await this.req.post({
      url: `session/run/${this.sessionID}`,
      body: { zoneNum: this.currZone, tick: tickTotal },
      status: 200,
      token: this.props.token ?? ''
    });

    this.replay.zoneStats.push({
      zoneNum: this.currZone,
      baseStats: RunTester.createStats(
        new Date(),
        this.replay.zoneStats.length > 0
          ? this.replay.zoneStats.at(-1).baseStats.totalTime
          : 0
      )
    });
  }

  async endRun(args?: {
    delay?: number;
    beforeSubmit?: (self: RunTester) => void;
    beforeSave?: (self: RunTester) => void;
    writeStats?: boolean;
    writeFrames?: boolean;
  }): Promise<ParsedResponse> {
    const delay = args?.delay ?? DEFAULT_DELAY_MS;

    await sleep(delay);
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

    if (this.replay.zoneStats.length > 0) {
      this.replay.zoneStats.push({
        zoneNum: this.currZone,
        baseStats: RunTester.createStats(
          new Date(),
          this.replay.zoneStats.at(-1).baseStats.totalTime
        )
      });

      this.replay.overallStats = {
        jumps: this.sumField('jumps'),
        strafes: this.sumField('strafes'),
        avgStrafeSync: this.sumField('avgStrafeSync'),
        avgStrafeSync2: this.sumField('avgStrafeSync2'),
        enterTime: 0,
        totalTime: this.replay.zoneStats.at(-1).baseStats.totalTime,
        velMax3D: this.sumField('velMax3D'),
        velMax2D: this.sumField('velMax2D'),
        velAvg3D: this.sumField('velAvg3D'),
        velAvg2D: this.sumField('velAvg2D'),
        velEnter3D: this.sumField('velEnter3D'),
        velEnter2D: this.sumField('velEnter2D'),
        velExit3D: this.sumField('velExit3D'),
        velExit2D: this.sumField('velExit2D')
      };
    } else {
      this.replay.overallStats = RunTester.createStats(new Date(), 0);
    }

    this.replay.frames = Array.from({ length: this.stopTick }, () =>
      RunTester.createFrame()
    );

    // Pass context to callback and execute, allowing tests to manipulate all sorts of nonsense. Gotta love JS!
    args?.beforeSave?.(this);

    this.writeReplayFile(args?.writeStats ?? true, args?.writeFrames ?? true);

    await new Promise((resolve) => setTimeout(resolve, 50));

    args?.beforeSubmit?.(this);

    return this.req.postAttach({
      url: `session/run/${this.sessionID}/end`,
      file: this.replayFile.buffer,
      token: this.props.token ?? ''
    });
  }

  private sumField(fieldName: string): number {
    return this.replay.zoneStats.reduce(
      (r, zs: ZoneStatsFromGame) => r + zs.baseStats[fieldName],
      0
    );
  }

  private writeReplayFile(writeStats = true, writeFrames = true) {
    // Header
    this.replayFile.writeHeader(this.replay);

    // Stats
    if (writeStats) {
      this.replayFile.writeInt8(1, false); // hasStats
      this.replayFile.writeInt8(this.replay.zoneStats.length); // numZones

      // Only testing non-IL for now
      this.replayFile.writeBaseStats(
        this.replay.overallStats,
        this.replay.header.tickRate
      );
      for (const zone of this.replay.zoneStats)
        this.replayFile.writeBaseStats(
          zone.baseStats,
          this.replay.header.tickRate
        );
    }

    if (writeFrames) {
      this.replayFile.writeInt32(this.replay.frames.length);
      // Frames
      for (const frame of this.replay.frames)
        this.replayFile.writeRunFrame(frame);
    }
  }

  private static createStats(
    startDate: Date,
    previousTime: number
  ): BaseStatsFromGame {
    const sqrt2 = Math.sqrt(2);
    const sqrt3 = Math.sqrt(3);
    return {
      jumps: Random.int(0, 5),
      strafes: Random.int(0, 5),
      avgStrafeSync: Random.float(70, 90),
      avgStrafeSync2: Random.float(70, 90),
      enterTime: previousTime,
      totalTime: (Date.now() - startDate.getTime()) / 1000,
      velMax3D: Random.float(0, sqrt3 * 3500),
      velMax2D: Random.float(0, sqrt2 * 3500),
      velAvg3D: Random.float(0, sqrt3 * 3500),
      velAvg2D: Random.float(0, sqrt2 * 3500),
      velEnter3D: Random.float(0, sqrt3 * 3500),
      velEnter2D: Random.float(0, sqrt2 * 3500),
      velExit3D: Random.float(0, sqrt3 * 3500),
      velExit2D: Random.float(0, sqrt2 * 3500)
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

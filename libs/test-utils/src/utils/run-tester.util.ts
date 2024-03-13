import {
  BaseStats,
  Replay,
  ReplayFileWriter,
  RunFrame,
  ZoneStats
} from '@momentum/formats/replay';
import { ParsedResponse, RequestUtil } from './request.util';
import { Gamemode, Tickrates, TrackType } from '@momentum/constants';
import * as Random from '@momentum/random';
import { arrayFrom } from '@momentum/util-fn';

const DEFAULT_DELAY_MS = 10;
const MAGIC = 0x524d4f4d;

// Wish we could use Jest fake timers here, but won't work with a live DB, as we
// rely on createdAt values generated from Prisma/Postgres
const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

export interface RunTesterProps {
  token?: string;
  mapID: number;
  mapName: string;
  mapHash: string;
  steamID: bigint;
  playerName: string;
  runDate: string;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  runFlags: number;
  startTick: number;
  tickRate?: number; // Otherwise uses gamemode's tickrate
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

  tickrate: number;

  startTime: number;
  startTick: number;
  stopTick: number;

  currSeg: number;
  currCP: number;
  currTime: number;

  private req: RequestUtil;

  constructor(req: RequestUtil, props: RunTesterProps) {
    this.req = req;
    this.props = props;
    this.replayFile = new ReplayFileWriter();
    this.tickrate = this.props.tickRate ?? Tickrates.get(props.gamemode);
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

  static async run(args: {
    req: RequestUtil;
    props: RunTesterProps;
    zones: number[]; // array of number of minor checkpoints. 4 cp linear would be [0, 0, 0, 0]
    delay?: number;
    startSeg?: number;
  }) {
    const runTester = new RunTester(args.req, args.props);
    await runTester.startRun({ startSeg: args.startSeg });

    await runTester.doZones(args.zones, args.delay ?? DEFAULT_DELAY_MS);

    return runTester.endRun({ delay: args.delay ?? DEFAULT_DELAY_MS });
  }

  async startRun(args?: { startSeg?: number }) {
    this.currSeg = args?.startSeg ?? 0;
    this.currCP = 0;
    this.startTick = this.props.startTick ?? 0;
    this.startTime = Date.now();

    const res = await this.req.post({
      url: 'session/run',
      body: {
        mapID: this.props.mapID,
        gamemode: this.props.gamemode,
        trackType: this.props.trackType,
        trackNum: this.props.trackNum,
        segment: args?.startSeg ?? 0
      },
      status: 200,
      token: this.props.token ?? ''
    });
    this.sessionID = res.body.id;
  }

  async doZones(zones: number[], delay = DEFAULT_DELAY_MS) {
    for (const [i, zone] of zones.entries()) {
      if (i > 0) await this.startSegment({ delay });
      for (let j = 0; j < zone; j++) {
        await this.doCP({ delay });
      }
    }
  }

  async doCP(args?: { delay?: number; setCP?: number }) {
    this.currCP = args?.setCP ?? this.currCP + 1;
    return this.doUpdate(args?.delay ?? DEFAULT_DELAY_MS);
  }

  async startSegment(args?: {
    delay?: number;
    setSeg?: number;
    setCP?: number;
  }) {
    this.currSeg = args?.setSeg ?? this.currSeg + 1;
    this.currCP = args?.setCP ?? 0;
    return this.doUpdate(args?.delay ?? DEFAULT_DELAY_MS);
  }

  async doUpdate(delay = DEFAULT_DELAY_MS) {
    await sleep(delay);

    this.currTime = Date.now();

    const timeTotal = Date.now() - this.startTime;
    const tickTotal = Math.ceil(timeTotal / 1000 / this.tickrate);

    await this.req.post({
      url: `session/run/${this.sessionID}`,
      body: { segment: this.currSeg, checkpoint: this.currCP, time: timeTotal },
      status: 204,
      token: this.props.token ?? ''
    });

    this.replay.zoneStats.push({
      zoneNum: 0, // TODO: This doesn't make sense but I don't know how we're changing replays for 0.10.0 yet.
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
    this.stopTick = Math.ceil(timeTotal / 1000 / this.tickrate);

    this.replay.magic = MAGIC;
    this.replay.version = 1;
    this.replay.header = {
      mapName: this.props.mapName,
      mapHash: this.props.mapHash,
      playerName: this.props.playerName,
      steamID: this.props.steamID,
      tickRate: this.tickrate,
      runFlags: this.props.runFlags,
      runDate: this.props.runDate,
      startTick: this.startTick,
      stopTick: this.stopTick,
      trackNum: this.props.trackNum,
      zoneNum: 0 // TODO: See above TODO
    };

    // TODO: Leaving several parts of this file commented out until we refactor
    // replay file to support new zones!
    // if (this.replay.zoneStats.length > 0) {
    //   this.replay.zoneStats.push({
    //     zoneNum: this.currZone,
    //     baseStats: RunTester.createStats(
    //       new Date(),
    //       this.replay.zoneStats.at(-1).baseStats.totalTime
    //     )
    //   });
    //
    //   this.replay.overallStats = {
    //     jumps: this.sumField('jumps'),
    //     strafes: this.sumField('strafes'),
    //     avgStrafeSync: this.sumField('avgStrafeSync'),
    //     avgStrafeSync2: this.sumField('avgStrafeSync2'),
    //     enterTime: 0,
    //     totalTime: this.replay.zoneStats.at(-1).baseStats.totalTime,
    //     velMax3D: this.sumField('velMax3D'),
    //     velMax2D: this.sumField('velMax2D'),
    //     velAvg3D: this.sumField('velAvg3D'),
    //     velAvg2D: this.sumField('velAvg2D'),
    //     velEnter3D: this.sumField('velEnter3D'),
    //     velEnter2D: this.sumField('velEnter2D'),
    //     velExit3D: this.sumField('velExit3D'),
    //     velExit2D: this.sumField('velExit2D')
    //   };
    // } else {
    //   this.replay.overallStats = RunTester.createStats(new Date(), 0);
    // }

    this.replay.frames = arrayFrom(this.stopTick, () =>
      RunTester.createFrame()
    );

    // Pass context to callback and execute, allowing tests to manipulate all
    // sorts of nonsense. Gotta love JS!
    args?.beforeSave?.(this);

    this.writeReplayFile(args?.writeStats ?? true, args?.writeFrames ?? true);

    await new Promise((resolve) => setTimeout(resolve, 50));

    args?.beforeSubmit?.(this);

    return this.req.postOctetStream({
      url: `session/run/${this.sessionID}/end`,
      body: this.replayFile.buffer,
      token: this.props.token ?? ''
    });
  }

  private sumField(fieldName: string): number {
    return this.replay.zoneStats.reduce(
      (r, zs: ZoneStats) => r + zs.baseStats[fieldName],
      0
    );
  }

  private writeReplayFile(writeStats = true, writeFrames = true) {
    // Header
    this.replayFile.writeHeader(this.replay);

    // TODO: See above
    // // Stats
    // if (writeStats) {
    //   this.replayFile.writeInt8(1, false); // hasStats
    //   this.replayFile.writeInt8(this.replay.zoneStats.length); // numZones
    //
    //   // Only testing non-IL for now
    //   this.replayFile.writeBaseStats(
    //     this.replay.overallStats,
    //     this.replay.header.tickRate
    //   );
    //   for (const zone of this.replay.zoneStats)
    //     this.replayFile.writeBaseStats(
    //       zone.baseStats,
    //       this.replay.header.tickRate
    //     );
    // }
    //
    // if (writeFrames) {
    //   this.replayFile.writeInt32(this.replay.frames.length);
    //   // Frames
    //   for (const frame of this.replay.frames)
    //     this.replayFile.writeRunFrame(frame);
    // }
  }

  private static createStats(startDate: Date, previousTime: number): BaseStats {
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

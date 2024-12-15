import { ParsedResponse, RequestUtil } from './request.util';
import {
  Gamemode,
  RunSplits,
  Tickrates,
  TrackType
} from '@momentum/constants';
import { sleep } from '@momentum/util-fn';
import * as ReplayFile from '@momentum/formats/replay';

const DEFAULT_DELAY_MS = 10;

export interface RunTesterProps {
  token?: string;
  mapID: number;
  mapName: string;
  mapHash: string;
  steamID: bigint;
  playerName: string;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
}

/**
 * Testing utility which fires run timestamp update calls to the server, then
 * generates replay header and splits in sync with the server's run updates.
 */
export class RunTester {
  props: RunTesterProps;

  sessionID: number;

  startTime: number;
  currTime: number;

  curMajor: number;
  curMinor: number;

  replayBuffer = Buffer.alloc(4000);
  segments: RunSplits.Segment[] = [];

  private req: RequestUtil;

  constructor(req: RequestUtil, props: RunTesterProps) {
    this.req = req;
    this.props = props;
  }

  static async run(args: {
    req: RequestUtil;
    props: RunTesterProps;
    segments: number[]; // array of number of minor checkpoints. 4 cp linear would be [0, 0, 0, 0]
    delay?: number;
    majorStart?: number;
  }) {
    const runTester = new RunTester(args.req, args.props);

    await runTester.startRun({ majorStart: args.majorStart });

    await runTester.doSegment(args.segments, args.delay ?? DEFAULT_DELAY_MS);

    return runTester.endRun({ delay: args.delay ?? DEFAULT_DELAY_MS });
  }

  async startRun(args?: { majorStart?: number }) {
    this.curMajor = args?.majorStart ?? 1;
    this.curMinor = 1;
    this.startTime = Date.now();

    const res = await this.req.post({
      url: 'session/run',
      body: {
        mapID: this.props.mapID,
        gamemode: this.props.gamemode,
        trackType: this.props.trackType,
        trackNum: this.props.trackNum
      },
      status: 200,
      token: this.props.token ?? ''
    });
    this.sessionID = res.body.id;

    this.segments.push({
      subsegments: [
        {
          velocityWhenReached: { x: 0, y: 0, z: 0 },
          timeReached: 0,
          minorNum: 1,
          stats: {
            jumps: 0,
            strafes: 0,
            horizontalDistanceTravelled: 0,
            overallDistanceTravelled: 0,
            maxOverallSpeed: 0,
            maxHorizontalSpeed: 0
          }
        }
      ],
      segmentStats: {
        jumps: 0,
        strafes: 0,
        horizontalDistanceTravelled: 0,
        overallDistanceTravelled: 0,
        maxOverallSpeed: 0,
        maxHorizontalSpeed: 0
      },
      checkpointsOrdered: true,
      effectiveStartVelocity: { x: 0, y: 0, z: 0 }
    });
  }

  async doSegment(segments: number[], delay = DEFAULT_DELAY_MS) {
    for (const [index, segment] of segments.entries()) {
      // Segment 1 start done in startRun
      if (index > 0) {
        await this.startMajor({ delay });
      }

      for (let j = 0; j < segment; j++) {
        await this.doMinor({ delay });
      }
    }
  }

  async doMinor(args?: { delay?: number; setMinor?: number }) {
    this.curMinor = args?.setMinor ?? this.curMinor + 1;
    return this.doUpdate(false, args?.delay ?? DEFAULT_DELAY_MS);
  }

  async startMajor(args?: {
    delay?: number;
    setMajor?: number;
    setMinor?: number;
  }) {
    this.curMajor = args?.setMajor ?? this.curMajor + 1;
    this.curMinor = args?.setMinor ?? 1;
    return this.doUpdate(true, args?.delay ?? DEFAULT_DELAY_MS);
  }

  async doUpdate(isNewSegment: boolean, delay = DEFAULT_DELAY_MS) {
    // Wish we could use Jest fake timers here, but won't work with a live DB,
    // as we rely on createdAt values generated from Prisma/Postgres
    await sleep(delay);

    this.currTime = Date.now();
    const timeTotal = Date.now() - this.startTime;

    await this.req.post({
      url: `session/run/${this.sessionID}`,
      body: {
        majorNum: this.curMajor,
        minorNum: this.curMinor,
        time: timeTotal
      },
      status: 204,
      token: this.props.token ?? ''
    });

    const subseg: RunSplits.Subsegment = {
      velocityWhenReached: { x: 0, y: 0, z: 0 },
      timeReached: timeTotal / 1000,
      minorNum: this.curMinor,
      stats: {
        jumps: 0,
        strafes: 0,
        horizontalDistanceTravelled: 0,
        overallDistanceTravelled: 0,
        maxOverallSpeed: 0,
        maxHorizontalSpeed: 0
      }
    };

    if (isNewSegment) {
      this.segments.push({
        effectiveStartVelocity: { x: 0, y: 0, z: 0 },
        checkpointsOrdered: true,
        segmentStats: {
          jumps: 0,
          strafes: 0,
          horizontalDistanceTravelled: 0,
          overallDistanceTravelled: 0,
          maxOverallSpeed: 0,
          maxHorizontalSpeed: 0
        },
        subsegments: [subseg]
      });
    } else {
      this.segments.at(-1).subsegments.push(subseg);
    }
  }

  async endRun(args?: {
    delay?: number;
    beforeSubmit?: (self: RunTester) => void;
    beforeSave?: (self: RunTester) => void;
  }): Promise<ParsedResponse> {
    const delay = args?.delay ?? DEFAULT_DELAY_MS;

    await sleep(delay);
    const timeTotal = Date.now() - this.startTime;

    const header: ReplayFile.ReplayHeader = {
      magic: ReplayFile.REPLAY_MAGIC,
      formatVersion: -1,
      timestamp: Date.now(),
      mapName: this.props.mapName,
      mapHash: this.props.mapHash,
      gamemode: this.props.gamemode,
      tickInterval: Tickrates.get(this.props.gamemode),
      playerSteamID: this.props.steamID,
      playerName: this.props.playerName,
      trackType: this.props.trackType,
      trackNum: this.props.trackNum,
      runTime: timeTotal / 1000
    };

    const splits: RunSplits.Splits = {
      segments: this.segments,
      trackStats: {
        maxHorizontalSpeed: 0,
        maxOverallSpeed: 0,
        overallDistanceTravelled: 0,
        jumps: 0,
        strafes: 0,
        horizontalDistanceTravelled: 0
      }
    };

    ReplayFile.Writer.writeHeader(header, this.replayBuffer);
    ReplayFile.Writer.writeRunSplits(splits, this.replayBuffer);

    // Pass context to callback and execute, allowing tests to manipulate all
    // sorts of nonsense. Gotta love JS!
    args?.beforeSave?.(this);

    await sleep(50);

    args?.beforeSubmit?.(this);

    return this.req.postOctetStream({
      url: `session/run/${this.sessionID}/end`,
      body: this.replayBuffer,
      token: this.props.token ?? ''
    });
  }
}

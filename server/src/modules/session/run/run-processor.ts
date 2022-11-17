import { Map as MapDB, MapTrack, RunSessionTimestamp, User, UserMapRank } from '@prisma/client';
import { RunSessionCompleted } from '../../repo/runs-repo.service';
import { AllowedGameModes, getDefaultTickRateForMapType } from '@common/enums/map.enum';
import { ReplayFileReader } from '@common/lib/replay-file-reader';
import {
    RunValidationError,
    RunValidationErrorTypes,
    RunValidationErrorTypes as ErrorType
} from '../../../common/enums/run.enum';
import { ProcessedRun, Replay } from './run-session.interfaces';

/**
 * Class for managing the parsing of a replay file and validating it against run data
 */
export class RunProcessor {
    replayFile: ReplayFileReader;
    replay: Replay;
    timestamps: RunSessionTimestamp[];
    track: MapTrack;
    map: MapDB;
    userID: number;
    steamID: string;
    zoneNum: number;
    trackNum: number;
    startTime: number;
    mapRank: UserMapRank;

    constructor(buffer: Buffer, session: RunSessionCompleted, user: User) {
        this.replayFile = new ReplayFileReader(buffer);
        this.zoneNum = session.zoneNum;
        this.trackNum = session.trackNum;
        this.startTime = session.createdAt.getTime();
        this.timestamps = session.timestamps;
        this.track = session.track;
        this.map = session.track.map;
        this.userID = user.id;
        this.steamID = user.steamID;
    }

    validateRunSession() {
        // If zoneNum is 0 it's an IL, so we shouldn't have any timestamps
        if (this.zoneNum > 0 && this.timestamps.length > 0) throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);

        if (this.timestamps.length > 0) {
            // - 1 because the start trigger doesn't have a timestamp generated for it
            if (this.timestamps.length !== this.track.numZones - 1)
                throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);

            let previousTick = 0;

            for (const timestamp of [...this.timestamps].sort((left, right) => {
                if (left.zone < right.zone) return -1;
                else if (left.zone > right.zone) return 1;
                else return 0;
            })) {
                if (timestamp.tick <= previousTick) throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
                previousTick = timestamp.tick;
            }
        } else {
            // timestamps length == 0
            if (this.track.numZones !== 1) {
                throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
            }
        }
    }

    processReplayFileHeader() {
        try {
            this.replay = {
                ...this.replayFile.readHeader(),
                overallStats: null,
                zoneStats: [],
                frames: []
            };
        } catch {
            throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
        }
        this.validateReplayHeader();
    }

    private validateReplayHeader() {
        const ticks = this.replay.header.stopTick - this.replay.header.startTick;
        const nowDate = Date.now();
        const sessionDiff = nowDate - this.startTime;
        const runTime = ticks * this.replay.header.tickRate;
        const epsilon = 0.000001;

        // Old api performs this check (https://github.com/momentum-mod/website/blob/369072802447e91cfdd7637a5e66fd9faa109a0c/server/src/models/run.js#L128)
        // but, if it fails, sends it back to the client for some reason. Do we want to start invalidating if this fails?
        /* 
        // 5 seconds for the stop tick -> end record -> submit, then we add a second for every minute in the replay
        // so longer replays have more time to submit, up to a max of 10 seconds
        const runToSessionDiff = Math.abs(sessionDiff - runTime * 1000.0) / 1000.0;
        const sesCheck = runToSessionDiff < 5.0 + Math.min(Math.floor(runTime / 60.0), 10.0);
        if (!sesCheck) {

        }
         */

        // prettier-ignore
        RunProcessor.validate([
            [this.replayFile.isOK,                                  ErrorType.BAD_REPLAY_FILE],
            [this.trackNum === this.replay.header.trackNum,         ErrorType.BAD_META],
            [this.replay.magic === 0x524d4f4d,                      ErrorType.BAD_META],
            [this.replay.header.steamID === this.steamID,           ErrorType.BAD_META],
            [this.replay.header.mapHash === this.map.hash,          ErrorType.BAD_META],
            [this.replay.header.mapName === this.map.name,          ErrorType.BAD_META],
            [ticks > 0,                                             ErrorType.BAD_TIMESTAMPS],
            [this.replay.header.trackNum === this.trackNum,         ErrorType.BAD_META],
            [this.replay.header.runFlags === 0,                     ErrorType.BAD_META], // Remove after runFlags are added
            [this.replay.header.zoneNum === this.zoneNum,           ErrorType.BAD_META],
            [!Number.isNaN(Number(this.replay.header.runDate)),     ErrorType.BAD_REPLAY_FILE],
            [Number(this.replay.header.runDate) <= nowDate,         ErrorType.OUT_OF_SYNC],
            [Math.abs(this.replay.header.tickRate 
                - getDefaultTickRateForMapType(this.map.type)) 
                < epsilon,                                          ErrorType.OUT_OF_SYNC],
            [runTime * 1000 <= sessionDiff,                         ErrorType.OUT_OF_SYNC],
            [AllowedGameModes.includes(this.map.type),          ErrorType.UNSUPPORTED_MODE]
        ]);
    }

    processReplayFileContents(): ProcessedRun {
        const ticks = this.replay.header.stopTick - this.replay.header.startTick;

        let overallStats, zoneStats;
        try {
            [overallStats, zoneStats] = this.replayFile.readStats(
                this.replay.header.zoneNum === 0,
                this.replay.header.tickRate
            );
        } catch {
            throw new RunValidationError(RunValidationErrorTypes.BAD_REPLAY_FILE);
        }

        // prettier-ignore
        RunProcessor.validate([
            [overallStats?.jumps < ticks,     ErrorType.FUCKY_BEHAVIOUR],
            [overallStats?.strafes < ticks,   ErrorType.FUCKY_BEHAVIOUR]
        ]);

        this.replay.overallStats = overallStats;
        this.replay.zoneStats = zoneStats;

        try {
            this.replayFile.readFrames(this.replay.header.stopTick);
        } catch {
            throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
        }

        const time = ticks * this.replay.header.tickRate;

        return {
            mapID: this.map.id,
            userID: this.userID,
            trackNum: this.replay.header.trackNum,
            zoneNum: this.replay.header.zoneNum,
            ticks: ticks,
            tickRate: this.replay.header.tickRate,
            flags: this.replay.header.runFlags,
            time: time,
            overallStats: overallStats,
            zoneStats: zoneStats
        };
    }

    private static validate(validations: [boolean, ErrorType][]): void {
        for (const [passed, errorType] of validations) {
            if (!passed) throw new RunValidationError(errorType);
        }
    }
}

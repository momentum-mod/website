import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { KillswitchType } from '@momentum/constants';
import {
  CreateRunSessionDto,
  RunSessionErrorDto,
  RunSessionIdDto,
  RunSessionResponseDto,
  UpdateRunSessionDto
} from '../../dto';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';
import { ValkeyService } from '../valkey/valkey.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { KillswitchService } from '../killswitch/killswitch.service';

@WebSocketGateway({ path: '/game' })
export class GameConnectionGateway {
  private readonly logger = new Logger(GameConnectionGateway.name);

  constructor(
    private readonly valkey: ValkeyService,
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly killswitch: KillswitchService
  ) {}

  @SubscribeMessage('session.create')
  async createSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: CreateRunSessionDto
  ): Promise<WsResponse<RunSessionResponseDto | RunSessionErrorDto>> {
    const userID = client.userId;

    // When run submission is disabled, refuse to start new sessions
    if (this.killswitch.checkKillswitch(KillswitchType.RUN_SUBMISSION)) {
      this.logger.warn(
        `session.create: blocked by RUN_SUBMISSION killswitch (userID=${userID})`
      );
      return {
        event: 'session.create',
        data: { error: 'Run submission is currently disabled' }
      };
    }

    const leaderboardData = {
      mapID: data.mapID,
      gamemode: data.gamemode,
      trackType: data.trackType,
      trackNum: data.trackNum
    };

    if (!(await this.db.leaderboard.exists({ where: leaderboardData }))) {
      this.logger.warn(
        `session.create: leaderboard not found (userID=${userID}, mapID=${data.mapID}, gamemode=${data.gamemode}, trackType=${data.trackType}, trackNum=${data.trackNum})`
      );
      return {
        event: 'session.create',
        data: { error: 'Leaderboard does not exist' }
      };
    }

    const sessionKey = idKey(userID);
    const sessionIDs = await this.valkey.lrange(sessionKey, 0, -1);
    for (const sessionID of sessionIDs) {
      const session = await this.valkey.hgetall(dataKey(sessionID));
      if (
        session &&
        Number(session.userID) === userID &&
        Number(session.trackType) === data.trackType &&
        Number(session.trackNum) === data.trackNum
      ) {
        await Promise.all([
          this.valkey.lrem(sessionKey, 0, sessionID),
          this.valkey.del(dataKey(sessionID))
        ]);
      }
    }

    const id = await this.valkey.incr(COUNTER_KEY);
    const createdAt = Date.now();
    const createdAtISO = new Date(createdAt).toISOString();

    await Promise.all([
      this.valkey.lpush(sessionKey, id),
      this.valkey.hset(dataKey(id), { userID, createdAt, ...leaderboardData }),
      this.valkey.lpush(
        timestampKey(id),
        serializeTimestamp(1, 1, 0, createdAt)
      )
    ]);

    this.logger.log(
      `session.create: created session (sessionID=${id}, userID=${userID}, mapID=${data.mapID})`
    );
    return {
      event: 'session.create',
      data: {
        id,
        userID,
        createdAt: createdAtISO,
        ...leaderboardData,
        timestamps: [
          { majorNum: 1, minorNum: 1, time: 0, createdAt: createdAtISO }
        ]
      }
    };
  }

  @SubscribeMessage('session.update')
  async updateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: UpdateRunSessionDto
  ): Promise<WsResponse<null | RunSessionErrorDto>> {
    const userID = client.userId;
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    if (!storedUserID || Number(storedUserID) !== userID) {
      this.logger.warn(
        `session.update: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { event: 'session.update', data: { error: 'Invalid session' } };
    }

    await this.valkey.lpush(
      timestampKey(data.sessionID),
      serializeTimestamp(data.majorNum, data.minorNum, data.time, Date.now())
    );

    this.logger.log(
      `session.update: timestamp added (sessionID=${data.sessionID}, userID=${userID}, majorNum=${data.majorNum}, minorNum=${data.minorNum}, time=${data.time})`
    );
    return { event: 'session.update', data: null };
  }

  @SubscribeMessage('session.invalidate')
  async invalidateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | RunSessionErrorDto>> {
    const userID = client.userId;
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    if (!storedUserID || Number(storedUserID) !== userID) {
      this.logger.warn(
        `session.invalidate: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return {
        event: 'session.invalidate',
        data: { error: 'Invalid session' }
      };
    }

    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, data.sessionID),
      this.valkey.del(dataKey(data.sessionID)),
      this.valkey.del(timestampKey(data.sessionID))
    ]);

    this.logger.log(
      `session.invalidate: session deleted (sessionID=${data.sessionID}, userID=${userID})`
    );
    return { event: 'session.invalidate', data: null };
  }

  @SubscribeMessage('session.end')
  async completeSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | RunSessionErrorDto>> {
    const userID = client.userId;
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    // This event and the replay upload (HTTP POST /session/run/:id/end) race and
    // can arrive in either order. If the session is already gone the upload won
    // the race and consumed it - that's the expected terminal state, so ack
    // without warning rather than treating it as an invalid session.
    if (!storedUserID) {
      return { event: 'session.end', data: null };
    }

    if (Number(storedUserID) !== userID) {
      this.logger.warn(
        `session.end: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { event: 'session.end', data: { error: 'Invalid session' } };
    }

    // Don't delete the session data/timestamps here: the replay upload still
    // needs them to validate and process the run, and may not have arrived yet.
    // Instead mark the session ended, drop it from the user's active list, and
    // set a TTL so the data is reaped if the upload never arrives (e.g. the
    // client crashed after ending but before uploading). The upload's
    // completeSession owns the final deletion once it has processed the run.
    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, data.sessionID),
      this.valkey.hset(dataKey(data.sessionID), 'ended', 1),
      this.valkey.expire(dataKey(data.sessionID), ENDED_SESSION_TTL_SECONDS),
      this.valkey.expire(
        timestampKey(data.sessionID),
        ENDED_SESSION_TTL_SECONDS
      )
    ]);

    this.logger.log(
      `session.end: session ended, awaiting replay upload (sessionID=${data.sessionID}, userID=${userID})`
    );
    return { event: 'session.end', data: null };
  }
}

function idKey(userID: number): string {
  return `runsess:id:${userID}`;
}

function dataKey(sessionID: string | number): string {
  return `runsess:dat:${sessionID}`;
}

function timestampKey(sessionID: string | number): string {
  return `runsess:ts:${sessionID}`;
}

function serializeTimestamp(
  majorNum: number,
  minorNum: number,
  time: number,
  createdAt: number
): string {
  return `${majorNum},${minorNum},${time},${createdAt}`;
}

const COUNTER_KEY = 'runsess:counter';

// How long an ended session's data/timestamps are kept alive waiting for the
// replay upload (HTTP) to arrive and process it, before being reaped. Generous
// enough to cover a slow upload of a large replay on a poor connection.
const ENDED_SESSION_TTL_SECONDS = 5 * 60;

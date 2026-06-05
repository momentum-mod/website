import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';
import { ValkeyService } from '../valkey/valkey.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@WebSocketGateway({ path: '/game' })
export class GameConnectionGateway {
  private readonly logger = new Logger(GameConnectionGateway.name);

  constructor(
    private readonly valkey: ValkeyService,
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  @SubscribeMessage('session.create')
  async createSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody()
    data: {
      mapID: number;
      gamemode: number;
      trackType: number;
      trackNum: number;
    }
  ): Promise<WsResponse<unknown>> {
    const userID = client.userId;
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
    const createdAtDate = new Date(createdAt);

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
        createdAt: createdAtDate,
        ...leaderboardData,
        timestamps: [
          { majorNum: 1, minorNum: 1, time: 0, createdAt: createdAtDate }
        ]
      }
    };
  }

  @SubscribeMessage('session.update')
  async updateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody()
    data: {
      sessionID: number;
      majorNum: number;
      minorNum: number;
      time: number;
    }
  ): Promise<WsResponse<unknown>> {
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
    @MessageBody() data: { sessionID: number }
  ): Promise<WsResponse<unknown>> {
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
    @MessageBody() data: { sessionID: number }
  ): Promise<WsResponse<unknown>> {
    const userID = client.userId;
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    if (!storedUserID || Number(storedUserID) !== userID) {
      this.logger.warn(
        `session.end: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { event: 'session.end', data: { error: 'Invalid session' } };
    }

    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, data.sessionID),
      this.valkey.del(dataKey(data.sessionID)),
      this.valkey.del(timestampKey(data.sessionID))
    ]);

    this.logger.log(
      `session.end: session completed (sessionID=${data.sessionID}, userID=${userID})`
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

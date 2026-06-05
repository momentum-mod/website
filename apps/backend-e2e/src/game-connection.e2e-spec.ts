import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@momentum/db';
import { DbUtil } from '@momentum/test-utils';
import { Gamemode, MapStatus, TrackType } from '@momentum/constants';
import { RunSessionDto } from '../../backend/src/app/dto';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import Valkey from 'iovalkey';
import { WebSocket } from 'ws';

type SocketEventMessage = {
  event: string;
  data?: unknown;
};

describe('Game Connection Gateway', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaClient;
  let db: DbUtil;
  let valkey: Valkey;
  let websocketUrl: string;
  let map: { id: number };

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    db = env.db;
    valkey = env.valkey;

    const configService = app.get(ConfigService);
    websocketUrl = `ws://localhost:${configService.getOrThrow<number>('wsPort')}/game`;

    map = await db.createMapWithFullLeaderboards(
      {
        name: 'ws_e2e_map',
        status: MapStatus.APPROVED
      },
      [Gamemode.AHOP]
    );
  });

  afterAll(async () => {
    await db.cleanup('mMap', 'user');
    await teardownE2ETestEnvironment(app, prisma);
  });

  afterEach(async () => {
    await clearRunSessions();
    await db.cleanup('user');
  });

  it('should establish a websocket connection', async () => {
    const [, token] = await db.createAndLoginGameUser();
    const socket = await openSocket(websocketUrl, token);

    socket.close();

    await waitForSocketClose(socket);
  });

  // TODO: This is LLM crap, really we should update session-e2e tests to use
  // WS, that already has the valid data. Still, fact this fails shows that
  // validation is working!
  it('should create a run session from the create-run handler', async () => {
    const [user, token] = await db.createAndLoginGameUser();
    const socket = await openSocket(websocketUrl, token);

    socket.send(
      JSON.stringify({
        event: 'create-run',
        data: {
          mapID: map.id,
          gamemode: Gamemode.AHOP,
          trackType: TrackType.MAIN,
          trackNum: 1
        }
      })
    );

    const message = await waitForSocketMessage(socket);

    expect(message.event).toBeUndefined();
    expect(message).toBeValidDto(RunSessionDto);
    expect((message as RunSessionDto).userID).toBe(user.id);

    socket.close();
    await waitForSocketClose(socket);
  });

  it('should reject invalid DTO payloads', async () => {
    const [user, token] = await db.createAndLoginGameUser();
    const socket = await openSocket(websocketUrl, token);

    socket.send(
      JSON.stringify({
        event: 'create-run',
        data: {
          mapID: map.id,
          gamemode: Gamemode.AHOP,
          trackType: TrackType.MAIN,
          trackNum: 0
        }
      })
    );

    const message = await waitForSocketMessage(socket);
    expect(message.event).toBe('exception');

    const sessions = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
    expect(sessions).toBe(0);

    socket.close();
    await waitForSocketClose(socket);
  });

  async function clearRunSessions() {
    const [, keys] = await valkey.scan(0, 'MATCH', 'runsess*', 'COUNT', 1000);
    if (keys.length > 0) {
      await valkey.del(...keys);
    }
  }
});

function openSocket(url: string, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function waitForSocketClose(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    socket.once('close', () => resolve());
  });
}

function waitForSocketMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.once('message', (raw) => {
      try {
        resolve(
          JSON.parse(raw.toString()) as SocketEventMessage | RunSessionDto
        );
      } catch (error) {
        reject(error);
      }
    });

    socket.once('error', reject);
  });
}

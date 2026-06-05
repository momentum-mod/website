import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AbstractWsAdapter,
  MessageMappingProperties
} from '@nestjs/websockets';
import fastJson from 'fast-json-stringify';
import { EventEmitter } from 'node:events';
import { EMPTY, Observable, fromEvent } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import * as uWS from 'uWebSockets.js';
import { JwtService } from '@nestjs/jwt';
import { UserJwtAccessPayloadVerified } from '../auth/auth.interface';

/**
 * Minimal per-connection context stored on each WebSocket object.
 * Extend this as the game protocol grows.
 */
interface GameSocketUserData {
  /** The authenticated user's ID, verified from the JWT during upgrade. */
  userID: number;
}

// TODO: Could validate this first. Make a generic DTO that takes some other
// DTO for `data`, validate event is a string.
interface GameSocketPayload {
  event: string;
  data: any;
}

/**
 * uWS WebSocket instance patched to include an EventEmitter for cleaner
 * integration with NestJS
 */
interface WsClient extends uWS.WebSocket<GameSocketUserData> {
  emitter: EventEmitter;
}

export class UWebSocketAdapter extends AbstractWsAdapter {
  private readonly logger = new Logger('UWebSocketAdapter');
  private readonly stringify = fastJson({});

  private instance: uWS.TemplatedApp | null = null;
  private listenSocket: false | uWS.us_listen_socket = false;
  private path = '/';
  // TODO: how tf do i pass this in properly
  private port = 3001;

  private readonly activeSockets = new Map<number, WsClient>();

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    super(app);
  }

  bindClientConnect(
    _server: uWS.TemplatedApp,
    callback: (socket: uWS.WebSocket<any>) => any
  ): void {
    this.instance.ws<GameSocketUserData>('/game', {
      idleTimeout: 120,
      maxPayloadLength: 1024 * 1024,

      // Upgrade: Validate JWT before handshake completes.
      upgrade: async (res, req, context) => {
        // Read headers needed for the WebSocket upgrade handshake.
        const secWebSocketKey = req.getHeader('sec-websocket-key');
        const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
        const secWebSocketExtensions = req.getHeader(
          'sec-websocket-extensions'
        );

        // uWS res callbacks become invalid once the async gap starts — cork
        // synchronously so we can still call res.end() inside the async catch.
        let aborted = false;
        res.onAborted(() => (aborted = true));

        // Extract the Bearer token from the Authorization header, or fall back
        // to a `token` query parameter for clients that cannot set headers
        // during the WebSocket handshake (e.g. browser WebSocket API).
        const authHeader = req.getHeader('authorization');
        const rawToken = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : (new URLSearchParams(req.getQuery()).get('token') ?? '');

        try {
          const payload =
            await this.jwtService.verifyAsync<UserJwtAccessPayloadVerified>(
              rawToken
            );

          if (aborted) return;

          if (!payload.gameAuth) {
            res.writeStatus('401 Unauthorized').end('Game auth required');
            return;
          }

          res.upgrade<GameSocketUserData>(
            { userID: payload.id },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context
          );
        } catch {
          // TODO: This errors with:
          // Error: uWS.HttpResponse must not be accessed after uWS.HttpResponse.onAborted callback, or after a successful response. See documentation for uWS.HttpResponse and consult the user manual.
          if (!aborted)
            res.writeStatus('401 Unauthorized').end('Invalid or missing token');
        }
      },

      // Open: The WebSocket handshake has completed successfully.
      open: (socket) => {
        const client = socket as WsClient;
        Object.defineProperties(client, {
          emitter: {
            configurable: false,
            value: new EventEmitter()
          }
        });

        const { userID } = socket.getUserData();

        // Close any existing socket for this user ID, ensuring only one active connection per user.
        // This can happen if the client's game crashes and they reconnect before the previous connection times out.
        this.activeSockets.get(userID)?.end(1008, 'Replaced by new connection');
        this.activeSockets.set(userID, client);
        this.logger.debug(`Game client connected (userID=${userID})`);

        callback(socket);
      },

      // Close: the connection has been torn down for any reason.
      close: (ws: WsClient, code: number, message: ArrayBuffer) => {
        const { userID } = ws.getUserData();
        if (this.activeSockets.get(userID) === ws)
          this.activeSockets.delete(userID);
        const reason = message.byteLength
          ? Buffer.from(message).toString('utf8')
          : '(no reason given)';
        this.logger.log(
          `Game client disconnected (userId=${userID}, code=${code}, reason=${reason})`
        );
      },

      message: (socket, message, isBinary) => {
        (socket as WsClient).emitter.emit('message', { message, isBinary });
      }
      // TODO: Probably not needed? Not sure, see nest source
      // close: (socket: ActiveSocket) => {
      //   socket.emitter?.emit('disconnect');
      //   socket.emitter?.removeAllListeners();
      // }
    });
  }

  bindMessageHandlers(
    client: WsClient,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>
  ): void {
    fromEvent(client['emitter'], 'message')
      .pipe(
        mergeMap((data: { message: ArrayBuffer; isBinary: boolean }) =>
          this.bindMessageHandler(data, handlers, process)
        ),
        filter((result) => result)
      )
      .subscribe((response) => {
        // TODO: Do we need to apply class-transformer transforms here?
        // Presumably then this needs to use `instanceToPlain`...
        return client.send(this.stringify(response));
      });
  }

  bindMessageHandler(
    buffer: { message: ArrayBuffer; isBinary: boolean },
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>
  ): Observable<any> {
    try {
      const stringMessageData = Buffer.from(buffer.message).toString('utf-8');
      const message = JSON.parse(stringMessageData) as GameSocketPayload;

      if (typeof message.event !== 'string') {
        return EMPTY;
      }

      const messageHandler = handlers.find(
        (handler) => handler.message === message.event
      );

      if (!messageHandler) {
        return EMPTY;
      }

      return process(messageHandler.callback(message.data));
    } catch {
      return EMPTY;
    }
  }

  override async close(_server: uWS.TemplatedApp): Promise<void> {
    if (!this.listenSocket) return;

    uWS.us_listen_socket_close(this.listenSocket);
    this.listenSocket = false;
    this.instance = null;
  }

  async create(
    port: number,
    options: uWS.AppOptions & { path: string }
  ): Promise<uWS.TemplatedApp> {
    this.port = 3001; // TODO: WHY IS THIS 0?????
    this.path = options.path;

    if (options.key_file_name && options.cert_file_name) {
      this.instance = uWS.SSLApp(options);
    } else {
      this.instance = uWS.App(options);
    }

    return new Promise((resolve, reject) =>
      this.instance.listen(this.port, (token) => {
        if (token) {
          this.listenSocket = token;
          this.logger.log(
            `WebSocket server listening on port ${this.port} (path: ${this.path})`
          );
          resolve(this.instance);
        } else {
          reject("Can't start listening...");
        }
      })
    );
  }

  override async dispose(): Promise<void> {
    if (this.instance) {
      await this.close(this.instance);
    }
  }
}

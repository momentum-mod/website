import WebSocket from 'ws';
import * as http from 'node:http';
import Stream from 'node:stream';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { AbstractWsAdapter } from '@nestjs/websockets';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { EMPTY, fromEvent, fromEventPattern, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { WebsocketService } from './websocket.service';
import { UserJwtAccessPayloadVerified } from '../auth/auth.interface';

/**
 * A `ws` socket with the authenticated user's ID attached during the upgrade.
 * Gateways can read it via `@ConnectedSocket()`.
 */
export type AuthenticatedWebSocket = WebSocket.WebSocket & { userId: number };

/**
 * `ws`-based WebSocket adapter that shares the app's HTTP server (hooking the
 * `upgrade` event rather than binding its own port), so the Node `cluster`
 * module round-robins WebSocket upgrades across workers like ordinary requests.
 *
 * Doesn't support Nest DI, so {@link WebsocketService} and {@link JwtService}
 * are injected manually from `main.ts`.
 */
export class WebsocketAdapter extends AbstractWsAdapter<
  WebSocket.Server,
  WebSocket.WebSocket
> {
  protected readonly logger = new Logger('WebsocketAdapter');

  constructor(
    appOrHttpServer: INestApplicationContext | object,
    private readonly wsService: WebsocketService,
    private readonly jwtService: JwtService
  ) {
    super(appOrHttpServer);
  }

  create(port: number, options?: WebSocket.ServerOptions): WebSocket.Server {
    const { path, ...wsOptions } = options ?? {};
    const httpServer = this.httpServer as http.Server;

    if (port !== 0) {
      throw new Error(
        "Separate WS server ports aren't supported; the WebSocket server " +
          'shares the main HTTP server. Use `@WebSocketGateway({ path })`.'
      );
    }

    if (!httpServer) {
      throw new Error('HTTP server not found');
    }

    const wsServer = this.initializeWsServer(wsOptions);

    httpServer.on('upgrade', (request, socket, head) =>
      this.onUpgrade(wsServer, path, request, socket, head)
    );

    return wsServer;
  }

  private initializeWsServer(
    wsOptions: WebSocket.ServerOptions
  ): WebSocket.Server {
    // `noServer` so we drive the upgrade handshake ourselves (auth + path).
    const server = new WebSocket.Server({ noServer: true, ...wsOptions });

    server.on('connection', (ws: WebSocket.WebSocket) => {
      ws.on('error', (err) => this.logger.error(err));
    });
    server.on('error', (err) => this.logger.error(err));

    return server;
  }

  private onUpgrade(
    wsServer: WebSocket.Server,
    path: string | undefined,
    request: http.IncomingMessage,
    socket: Stream.Duplex,
    head: Buffer
  ) {
    try {
      const url = new URL(request.url ?? '', `ws://${request.headers.host}/`);

      if (url.pathname !== path) {
        socket.destroy();
        return;
      }

      const authHeader = request.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (url.searchParams.get('token') ?? '');

      let payload: UserJwtAccessPayloadVerified;
      try {
        payload = this.jwtService.verify<UserJwtAccessPayloadVerified>(token);
      } catch {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\nInvalid or missing token');
        return;
      }

      if (!payload.gameAuth) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\nGame auth required');
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as AuthenticatedWebSocket;
        client.userId = payload.id;
        this.wsService.addClient(payload.id, client);
        ws.on('close', () => this.wsService.removeClient(payload.id, client));
        wsServer.emit('connection', ws, request);
      });
    } catch (err) {
      socket.end(`HTTP/1.1 400 Bad Request\r\n\r\n${(err as Error).message}`);
    }
  }

  bindMessageHandlers(
    client: WebSocket.WebSocket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>
  ) {
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach((handler) => handlersMap.set(handler.message, handler));

    const close$ = fromEvent(client, 'close').pipe(share(), first());
    // Bind the Node EventEmitter API explicitly via `client.on`. `ws` sockets
    // also expose `addEventListener`, which RxJS `fromEvent` would prefer — but
    // that path wraps the payload in a `MessageEvent` rather than handing us the
    // raw `(data, isBinary)`, so we'd parse the wrong thing.
    const source$ = fromEventPattern<WebSocket.RawData>(
      (handler) => client.on('message', handler as (...args: any[]) => void),
      (handler) => client.off('message', handler as (...args: any[]) => void),
      // `ws` calls the listener with `(data, isBinary)`; keep only the data.
      (data: WebSocket.RawData) => data
    ).pipe(
      mergeMap((data) =>
        this.bindMessageHandler(data, handlersMap, transform).pipe(
          filter((result) => !isNil(result))
        )
      ),
      takeUntil(close$)
    );

    source$.subscribe((response) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(response));
      }
    });
  }

  private bindMessageHandler(
    buffer: WebSocket.RawData,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>
  ): Observable<any> {
    try {
      const raw = Array.isArray(buffer)
        ? Buffer.concat(buffer)
        : Buffer.isBuffer(buffer)
          ? buffer
          : Buffer.from(buffer);
      const message = JSON.parse(raw.toString('utf-8'));

      const messageHandler = handlersMap.get(message?.event);
      if (!messageHandler) {
        return EMPTY;
      }

      const { callback } = messageHandler;
      return transform(callback(message.data, message.event));
    } catch {
      return EMPTY;
    }
  }

  bindClientDisconnect(
    client: WebSocket.WebSocket,
    callback: (this: WebSocket.WebSocket, code: number, reason: Buffer) => void
  ) {
    client.on('close', callback);
  }

  async close(server: WebSocket.Server) {
    const closeEventSignal = new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );

    for (const ws of server.clients) {
      ws.terminate();
    }

    await closeEventSignal;
  }
}

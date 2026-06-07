import WebSocket from 'ws';
import * as http from 'node:http';
import Stream from 'node:stream';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { AbstractWsAdapter } from '@nestjs/websockets';
import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { EMPTY, fromEvent, Observable } from 'rxjs';
import { filter, first, mergeMap, share, takeUntil } from 'rxjs/operators';
import { WebsocketService } from './websocket.service';
import { JwtService } from '@nestjs/jwt';
import { UserJwtAccessPayloadVerified } from '../auth/auth.interface';

export class WebsocketAdapter extends AbstractWsAdapter<
  WebSocket.Server,
  WebSocket.WebSocket
> {
  protected readonly logger = new Logger('Websocket Adapter');

  constructor(
    appOrHttpServer: INestApplicationContext | object,
    private readonly wsService: WebsocketService,
    private readonly jwtService: JwtService
  ) {
    super(appOrHttpServer);
  }

  create(port: number, options?: WebSocket.ServerOptions): WebSocket.Server {
    const { path, ...wsOptions } = options;
    const httpServer = this.httpServer as http.Server;

    if (port !== 0) {
      throw new Error("Separate WS server ports aren't supported");
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
    const server = new WebSocket.Server({
      noServer: true,
      ...wsOptions
    });

    // TODO: Logging isn't very helpful, maybe use Sentry?
    server.on('connection', (ws: WebSocket.WebSocket) => {
      ws.on('error', (err: any) => this.logger.error(err));
    });
    server.on('error', (err: any) => this.logger.error(err));

    return server;
  }

  private onUpgrade(
    wsServer: WebSocket.Server,
    path: string,
    request: http.IncomingMessage,
    socket: Stream.Duplex,
    head: Buffer<ArrayBufferLike>
  ) {
    try {
      const baseUrl = 'ws://' + request.headers.host + '/';
      const pathname = new URL(request.url!, baseUrl).pathname;

      if (pathname !== path) {
        socket.destroy();
        return;
      }

      const authHeader = request.headers.authorization ?? '';
      const token = authHeader.slice(7);
      try {
        const { id, gameAuth } =
          this.jwtService.verify<UserJwtAccessPayloadVerified>(token);

        if (!gameAuth) {
          socket.end('HTTP/1.1 401\r\n' + 'Game auth required');
          return;
        }

        wsServer.handleUpgrade(request, socket, head, (ws) => {
          this.wsService.addClient(id, ws);

          return wsServer.emit('connection', ws, request);
        });
      } catch {
        socket.end('HTTP/1.1 401\r\n' + 'Invalid or missing token');
        return;
      }
    } catch (err) {
      socket.end('HTTP/1.1 400\r\n' + err.message);
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
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap((data) =>
        this.bindMessageHandler(data, handlersMap, transform).pipe(
          filter((result) => !isNil(result))
        )
      ),
      takeUntil(close$)
    );

    const onMessage = (response: any) => {
      if (client.readyState !== WebSocket.WebSocket.OPEN) {
        return;
      }

      // TODO: Does this need to be instanceToPlain to get CT to apply?
      // Nest might handle itself, test it out.
      client.send(JSON.stringify(response));
    };
    source$.subscribe(onMessage);
  }

  private bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>
  ): Observable<any> {
    try {
      const stringMessageData = Buffer.from(buffer.message).toString('utf-8');
      const message = JSON.parse(stringMessageData);

      if (!message) {
        return EMPTY;
      }

      const messageHandler = handlersMap.get(message.event)!;
      const { callback } = messageHandler;
      return transform(callback(message.data, message.event));
    } catch {
      return EMPTY;
    }
  }

  public bindClientDisconnect(
    client: WebSocket.WebSocket,
    callback: (this: WebSocket.WebSocket, code: number, reason: Buffer) => void
  ) {
    client.on('close', callback);
  }

  public async close(server: WebSocket.Server) {
    const closeEventSignal = new Promise<void>((resolve, reject) =>
      server.close((err: Error) => (err ? reject(err) : resolve()))
    );

    for (const ws of server.clients) {
      ws.terminate();
    }

    await closeEventSignal;
  }
}

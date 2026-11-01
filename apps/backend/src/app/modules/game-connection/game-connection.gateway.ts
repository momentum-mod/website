import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse
} from '@nestjs/websockets';
import {
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors
} from '@nestjs/common';
import {
  CreateRunSessionDto,
  RunSessionIdDto,
  UpdateRunSessionDto
} from '../../dto';
import { RunSessionWsResponseSchema } from '../../dto/run/run-session.schema';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';
import { RunSessionService } from '../session/run/run-session.service';

/**
 * Game client WebSocket entrypoint (`/game`).
 *
 * This is a thin transport layer: each handler frames an incoming message, hands
 * it to the relevant subsystem service, and wraps the result back into a
 * `{ event, data }` response. Business logic lives in the services (run sessions
 * in {@link RunSessionService}), so new subsystems are added as a new service
 * plus a handful of delegating handlers here.
 */
@WebSocketGateway({ path: '/game' })
export class GameConnectionGateway {
  constructor(private readonly runSession: RunSessionService) {}

  @SubscribeMessage('runsession.create')
  @UseInterceptors(StandardSchemaSerializerInterceptor)
  @SerializeOptions({ schema: RunSessionWsResponseSchema })
  async createSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: CreateRunSessionDto
  ) {
    return {
      event: 'runsession.create',
      data: await this.runSession.createSession(client.userId, data)
    };
  }

  @SubscribeMessage('runsession.update')
  async updateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: UpdateRunSessionDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.update',
      data: await this.runSession.updateSession(client.userId, data)
    };
  }

  @SubscribeMessage('runsession.invalidate')
  async invalidateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.invalidate',
      data: await this.runSession.invalidateSession(client.userId, data)
    };
  }

  @SubscribeMessage('runsession.end')
  async completeSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.end',
      data: await this.runSession.endSession(client.userId, data)
    };
  }
}

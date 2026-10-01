import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse
} from '@nestjs/websockets';
import {
  CreateRunSessionDto,
  LobbyStatusDto,
  MapLobbyPlayerCountsDto,
  MapLobbyPlayerCountsQueryDto,
  PlayerChatBansListDto,
  PlayerChatBansQueryDto,
  RunSessionIdDto,
  RunSessionResponseDto,
  UpdateRunSessionDto,
  validateWsBody,
  WsResponseDto
} from '../../dto';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';
import { RunSessionService } from '../session/run/run-session.service';
import { LobbyService } from '../lobby/lobby.service';
import { ChatBansService } from '../chat-bans/chat-bans.service';

/**
 * Game client WebSocket entrypoint (`/game`).
 *
 * This is a thin transport layer: each handler frames an incoming message, hands
 * it to the relevant subsystem service, and wraps the result back into a
 * `{ event, data }` response. Business logic lives in the services (run sessions
 * in {@link RunSessionService}, lobby tracking in {@link LobbyService}, chat ban
 * lookups in {@link ChatBansService}), so new
 * subsystems are added as a new service plus a handful of delegating handlers
 * here.
 */
@WebSocketGateway({ path: '/game' })
export class GameConnectionGateway implements OnGatewayDisconnect {
  constructor(
    private readonly runSession: RunSessionService,
    private readonly lobby: LobbyService,
    private readonly chatBans: ChatBansService
  ) {}

  handleDisconnect(client: AuthenticatedWebSocket) {
    void this.lobby.handleDisconnect(client);
  }

  @SubscribeMessage('runsession.create')
  async createSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: CreateRunSessionDto
  ): Promise<WsResponseDto<RunSessionResponseDto>> {
    return new WsResponseDto(
      RunSessionResponseDto,
      'runsession.create',
      await this.runSession.createSession(client.userId, data)
    );
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

  @SubscribeMessage('lobby.update')
  async updateLobbyStatus(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() body: unknown
  ): Promise<WsResponse<null | { error: string }>> {
    const validated = await validateWsBody(LobbyStatusDto, body);
    return {
      event: 'lobby.update',
      data:
        'error' in validated
          ? validated
          : await this.lobby.updateStatus(client, validated.data)
    };
  }

  @SubscribeMessage('lobby.leave')
  async leaveLobby(
    @ConnectedSocket() client: AuthenticatedWebSocket
  ): Promise<WsResponse<null>> {
    return {
      event: 'lobby.leave',
      data: await this.lobby.leaveLobby(client)
    };
  }

  @SubscribeMessage('lobby.mapcounts')
  async getMapLobbyPlayerCounts(
    @MessageBody() body: unknown
  ): Promise<WsResponseDto<MapLobbyPlayerCountsDto>> {
    const validated = await validateWsBody(MapLobbyPlayerCountsQueryDto, body);
    return new WsResponseDto(
      MapLobbyPlayerCountsDto,
      'lobby.mapcounts',
      'error' in validated
        ? validated
        : await this.lobby.getMapPlayerCounts(validated.data.gamemode)
    );
  }

  @SubscribeMessage('chatbans.get')
  async getPlayerChatBans(
    @MessageBody() body: unknown
  ): Promise<WsResponseDto<PlayerChatBansListDto>> {
    const validated = await validateWsBody(PlayerChatBansQueryDto, body);
    return new WsResponseDto(
      PlayerChatBansListDto,
      'chatbans.get',
      'error' in validated
        ? validated
        : await this.chatBans.getPlayerBans(validated.data.steamIDs)
    );
  }
}

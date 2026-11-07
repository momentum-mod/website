import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
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
  VALIDATION_PIPE_CONFIG,
  WsResponseDto
} from '../../dto';
import { WsExceptionFilter } from '../../filters/ws-exception.filter';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';
import { RunSessionService } from '../session/run/run-session.service';
import { LobbyService } from '../lobby/lobby.service';
import { BansService } from '../reports/bans.service';

/**
 * Game client WebSocket entrypoint (`/game`).
 *
 * This is a thin transport layer: each handler frames an incoming message, hands
 * it to the relevant subsystem service, and wraps the result back into a
 * `{ event, data }` response. Business logic lives in the services (run sessions
 * in {@link RunSessionService}, lobby tracking in {@link LobbyService}, chat ban
 * lookups in {@link BansService}), so new
 * subsystems are added as a new service plus a handful of delegating handlers
 * here.
 */
@UsePipes(new ValidationPipe(VALIDATION_PIPE_CONFIG))
@UseFilters(WsExceptionFilter)
@WebSocketGateway({ path: '/game' })
export class GameConnectionGateway implements OnGatewayDisconnect {
  constructor(
    private readonly runSession: RunSessionService,
    private readonly lobby: LobbyService,
    private readonly bans: BansService
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
      await this.runSession.createSession(client.userID, data)
    );
  }

  @SubscribeMessage('runsession.update')
  async updateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: UpdateRunSessionDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.update',
      data: await this.runSession.updateSession(client.userID, data)
    };
  }

  @SubscribeMessage('runsession.invalidate')
  async invalidateSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.invalidate',
      data: await this.runSession.invalidateSession(client.userID, data)
    };
  }

  @SubscribeMessage('runsession.end')
  async completeSession(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: RunSessionIdDto
  ): Promise<WsResponse<null | { error: string }>> {
    return {
      event: 'runsession.end',
      data: await this.runSession.endSession(client.userID, data)
    };
  }

  @SubscribeMessage('lobby.update')
  async updateLobbyStatus(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: LobbyStatusDto
  ): Promise<WsResponse<null>> {
    return {
      event: 'lobby.update',
      data: await this.lobby.updateStatus(client, data)
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
    @MessageBody() data: MapLobbyPlayerCountsQueryDto
  ): Promise<WsResponseDto<MapLobbyPlayerCountsDto>> {
    return new WsResponseDto(
      MapLobbyPlayerCountsDto,
      'lobby.mapcounts',
      await this.lobby.getMapPlayerCounts(data.gamemode)
    );
  }

  @SubscribeMessage('chatbans.get')
  async getPlayerChatBans(
    @MessageBody() data: PlayerChatBansQueryDto
  ): Promise<WsResponseDto<PlayerChatBansListDto>> {
    return new WsResponseDto(
      PlayerChatBansListDto,
      'chatbans.get',
      await this.bans.getPlayerBans(data.steamIDs)
    );
  }
}

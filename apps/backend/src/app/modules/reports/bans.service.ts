import { Inject, Injectable, Logger } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { Prisma } from '@momentum/db';
import { DtoFactory, PlayerChatBansDto } from '../../dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { WebsocketService } from '../websockets/websocket.service';

/**
 * Tells game clients which players are chat/voice banned, so they can mute
 * them.
 *
 * Banned players' own clients refuse to send, but a modified client wouldn't,
 * and lobby chat goes directly between players through Steam. So every client
 * looks up the players in its lobby by the Steam IDs Steam gives it, which a
 * banned player can't fake, and is sent any later changes to their bans.
 */
@Injectable()
export class BansService {
  private readonly logger = new Logger(BansService.name);

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly wsService: WebsocketService
  ) {}

  /**
   * Active bans of each of the given players. Players with no active bans, or
   * no account, are left out.
   */
  async getPlayerBans(
    steamIDs: string[]
  ): Promise<{ players: PlayerChatBansDto[] }> {
    const users = await this.db.user.findMany({
      where: {
        steamID: { in: Array.from(new Set(steamIDs)).map(BigInt) },
        chatBans: { some: activeBanFilter() }
      },
      select: playerBansSelect()
    });

    return { players: users.map(toPlayerChatBansDto) };
  }

  /**
   * Send a user's current bans to every connected game client, after they've
   * been issued, edited or revoked.
   *
   * Goes to everyone rather than the user's lobby, since that's only known
   * from what the user's own client reports.
   */
  async broadcastPlayerBans(userID: number): Promise<void> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userID },
        select: playerBansSelect()
      });
      if (!user) return;

      this.wsService.broadcastToAll({
        event: 'chatbans.update',
        data: instanceToPlain(toPlayerChatBansDto(user))
      });
    } catch (error) {
      // The ban change itself succeeded, so don't fail the request over this.
      // Clients that missed it pick it up the next time they look the user up.
      this.logger.error(
        `broadcastPlayerBans: failed to broadcast (userID=${userID})`,
        error
      );
    }
  }
}

function playerBansSelect() {
  return {
    steamID: true,
    chatBans: {
      where: activeBanFilter(),
      select: { type: true, expiresAt: true }
    }
  } satisfies Prisma.UserSelect;
}

function activeBanFilter(): Prisma.ChatBanWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}

function toPlayerChatBansDto({
  steamID,
  chatBans: bans
}: Prisma.UserGetPayload<{ select: ReturnType<typeof playerBansSelect> }>) {
  return DtoFactory(PlayerChatBansDto, { steamID, bans });
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@momentum/db';
import { PlayerChatBans } from '@momentum/constants';
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
export class ChatBansService {
  private readonly logger = new Logger(ChatBansService.name);

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly wsService: WebsocketService
  ) {}

  /**
   * Active bans of each player, including an empty entry for every player with
   * no bans or no account, so clients know they've been checked.
   */
  async getPlayerBans(
    steamIDs: string[]
  ): Promise<{ players: PlayerChatBans[] }> {
    const uniqueIDs = [...new Set(steamIDs)];

    const users = await this.db.user.findMany({
      where: { steamID: { in: uniqueIDs.map(BigInt) } },
      select: {
        steamID: true,
        chatBans: { where: activeBanFilter(), select: banSelect }
      }
    });

    const bansBySteamID = new Map(
      users.map(({ steamID, chatBans }) => [steamID.toString(), chatBans])
    );

    return {
      players: uniqueIDs.map((steamID) => ({
        steamID,
        bans: (bansBySteamID.get(steamID) ?? []).map(toPlayerBan)
      }))
    };
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
        select: {
          steamID: true,
          chatBans: { where: activeBanFilter(), select: banSelect }
        }
      });
      if (!user?.steamID) return;

      // Not annotated, as an interface type isn't assignable to JsonValue
      const data = {
        steamID: user.steamID.toString(),
        bans: user.chatBans.map(toPlayerBan)
      } satisfies PlayerChatBans;
      this.wsService.broadcastToAll({ event: 'chatbans.update', data });
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

const banSelect = { type: true, expiresAt: true } as const;

function activeBanFilter(): Prisma.ChatBanWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}

function toPlayerBan({
  type,
  expiresAt
}: {
  type: number;
  expiresAt: Date | null;
}): PlayerChatBans['bans'][number] {
  return { type, expiresAt: expiresAt?.toISOString() ?? null };
}

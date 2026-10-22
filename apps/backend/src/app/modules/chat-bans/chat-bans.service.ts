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
   *
   * Each entry has the player's revision, which orders it against other
   * snapshots of the same player: this response can reach a client after a
   * newer {@link broadcastPlayerBans} update.
   */
  async getPlayerBans(
    steamIDs: string[]
  ): Promise<{ players: PlayerChatBans[] }> {
    const uniqueIDs = [...new Set(steamIDs)];

    const users = await this.db.user.findMany({
      where: { steamID: { in: uniqueIDs.map(BigInt) } },
      select: playerBansSelect()
    });

    const bansBySteamID = new Map(
      users.map((user) => [user.steamID!.toString(), user])
    );

    return {
      players: uniqueIDs.map((steamID) => {
        const user = bansBySteamID.get(steamID);
        return user
          ? toPlayerChatBans(user)
          : { steamID, revision: 0, bans: [] };
      })
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
        select: playerBansSelect()
      });
      if (!user?.steamID) return;

      this.wsService.broadcastToAll({
        event: 'chatbans.update',
        data: toPlayerChatBans(user)
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

/**
 * Prisma reads the user row, with its revision, before the bans. A ban change
 * landing in between makes the snapshot newer than its revision, which is safe:
 * the change's own update has a higher revision still, and so isn't discarded
 * as stale by clients that already applied this one.
 */
function playerBansSelect() {
  return {
    steamID: true,
    chatBansRevision: true,
    chatBans: { where: activeBanFilter(), select: banSelect }
  } satisfies Prisma.UserSelect;
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

function toPlayerChatBans(user: {
  steamID: bigint | null;
  chatBansRevision: number;
  chatBans: { type: number; expiresAt: Date | null }[];
}) {
  // Not annotated, as an interface type isn't assignable to JsonValue
  return {
    steamID: user.steamID!.toString(),
    revision: user.chatBansRevision,
    bans: user.chatBans.map(toPlayerBan)
  } satisfies PlayerChatBans;
}

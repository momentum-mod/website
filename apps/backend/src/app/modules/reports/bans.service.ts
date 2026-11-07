import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@momentum/db';
import { UserDto, WsResponseDto } from '../../dto';
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
  async getPlayerBans(steamIDs: string[]) {
    const users = await this.db.user.findMany({
      where: {
        steamID: { in: Array.from(new Set(steamIDs)).map(BigInt) },
        chatBans: { some: activeBanFilter() }
      },
      select: playerBansSelect()
    });

    return {
      // TODO: Stupid .map to rename chatBans to bans, table is becoming bans in
      // future anyway...
      players: users.map(({ steamID, chatBans }) => ({
        steamID,
        bans: chatBans
      }))
    };
  }

  /**
   * Send a user's current bans to every connected game client, after they've
   * been issued, edited or revoked.
   *
   * Goes to everyone rather than the user's lobby, since that's only known
   * from what the user's own client reports.
   *
   * TODO: This is adds unnecessary load across all workers, we either need a
   * staggered message delivery system (probably want this for other announces
   * anyway), or just implement this in a more sensible way -- make game clients
   * communicate other players in their lobby so we can have reliable sync'd
   * state.
   */
  async broadcastPlayerBans(userID: number): Promise<void> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userID },
        select: playerBansSelect()
      });
      if (!user) return;

      (user as any).bans = user.chatBans; // TODO: Stupid rename, see above
      delete user.chatBans;

      this.wsService.broadcastToAll(
        new WsResponseDto(UserDto, 'chatbans.update', user)
      );
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

export type PlayerBans = Array<Pick<UserDto, 'steamID' | 'chatBans'>>;

const playerBansSelect = () => ({
  steamID: true,
  chatBans: {
    where: activeBanFilter(),
    select: { type: true, expiresAt: true }
  }
});

const activeBanFilter = (): Prisma.ChatBanWhereInput => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
});

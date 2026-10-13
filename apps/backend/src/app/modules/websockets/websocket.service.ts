import cluster from 'node:cluster';
import WebSocket from 'ws';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { JsonValue } from 'type-fest';
import {
  ClusterMessage,
  ClusterMessageType,
  sendClusterMessage
} from '../../../clustered';
import type { AuthenticatedWebSocket } from './websocket.adapter';

type Client = AuthenticatedWebSocket;

const WS_BROADCAST_ALL_KEY = 'ws_broadcast_all';
const WS_BROADCAST_USERS_KEY = 'ws_broadcast_users';
const WS_USER_CONNECTED_KEY = 'ws_user_connected';

const REPLACED_CLOSE_CODE = 1008;
const REPLACED_CLOSE_REASON = 'Replaced by new connection';

interface BroadcastAllPayload {
  key: typeof WS_BROADCAST_ALL_KEY;
  message: JsonValue;
}

interface BroadcastUsersPayload {
  key: typeof WS_BROADCAST_USERS_KEY;
  userIDs: number[];
  message: JsonValue;
}

/** A user's new connection, which replaces their older ones on other workers. */
interface UserConnectedPayload {
  key: typeof WS_USER_CONNECTED_KEY;
  userID: number;
  connectionID: string;
  connectedAt: number;
}

type PubSubPayload =
  | BroadcastAllPayload
  | BroadcastUsersPayload
  | UserConnectedPayload;

/**
 * Owns the set of active WebSocket connections for the current worker and
 * provides cluster-aware broadcasting.
 *
 * In a clustered deployment any given user's socket lives on exactly one
 * worker (see {@link addClient}), but the code wanting to message them could be
 * running on any worker.
 * Broadcasts are therefore published to the primary process, which fans them
 * out to every worker (see {@link sendClusterMessage}); each worker then
 * delivers to whichever of its own sockets match.
 */
@Injectable()
export class WebsocketService implements OnModuleInit {
  private readonly activeClients = new Map<number, Client>();

  onModuleInit() {
    // Receive pub/sub messages fanned out by the primary process. In a worker,
    // messages from the primary arrive on the process IPC channel.
    process.on('message', (message: ClusterMessage) => {
      if (message?.type === ClusterMessageType.PubSub) {
        this.deliver(message.payload as PubSubPayload);
      }
    });
  }

  /**
   * Register a user's new connection, closing any older one they have open.
   *
   * The older one may be on another worker, which is told to close it too.
   * Otherwise both stay open, and whatever the old one still reports (e.g. its
   * lobby) overwrites the new one's.
   */
  addClient(userID: number, client: Client) {
    this.activeClients
      .get(userID)
      ?.close(REPLACED_CLOSE_CODE, REPLACED_CLOSE_REASON);
    this.activeClients.set(userID, client);

    if (cluster.isWorker) {
      sendClusterMessage({
        type: ClusterMessageType.PubSub,
        payload: {
          key: WS_USER_CONNECTED_KEY,
          userID,
          connectionID: client.connectionID,
          connectedAt: client.connectedAt
        } satisfies UserConnectedPayload
      });
    }
  }

  removeClient(userID: number, client: Client) {
    // Only remove if this is still the active socket for the user; a newer
    // connection may have already replaced it.
    if (this.activeClients.get(userID) === client) {
      this.activeClients.delete(userID);
    }
  }

  getClient(userID: number): Client | undefined {
    return this.activeClients.get(userID);
  }

  broadcastToAll(message: JsonValue) {
    this.dispatch({ key: WS_BROADCAST_ALL_KEY, message });
  }

  broadcastToUsers(userIDs: number[], message: JsonValue) {
    this.dispatch({ key: WS_BROADCAST_USERS_KEY, userIDs, message });
  }

  private dispatch(payload: PubSubPayload) {
    if (cluster.isWorker) {
      // Round-trip via the primary so every worker (including this one) gets a
      // chance to deliver to its own sockets.
      sendClusterMessage({ type: ClusterMessageType.PubSub, payload });
    } else {
      // Single-process mode: no IPC, deliver straight to our own sockets.
      this.deliver(payload);
    }
  }

  private deliver(payload: PubSubPayload) {
    if (payload.key === WS_USER_CONNECTED_KEY) {
      this.closeOlderConnection(payload);
      return;
    }

    const data = JSON.stringify(payload.message);

    if (payload.key === WS_BROADCAST_ALL_KEY) {
      for (const client of this.activeClients.values()) {
        this.send(client, data);
      }
    } else if (payload.key === WS_BROADCAST_USERS_KEY) {
      for (const userID of payload.userIDs) {
        this.send(this.activeClients.get(userID), data);
      }
    }
  }

  /**
   * Close this worker's connection for the user if it's older than the one
   * that just opened. Two connections opening at once on different workers
   * each hear about the other, so comparing them like this rather than by
   * arrival leaves exactly one open.
   */
  private closeOlderConnection(payload: UserConnectedPayload) {
    const existing = this.activeClients.get(payload.userID);
    if (!existing || existing.connectionID === payload.connectionID) return;

    const isOlder =
      existing.connectedAt !== payload.connectedAt
        ? existing.connectedAt < payload.connectedAt
        : existing.connectionID < payload.connectionID;
    if (isOlder) {
      existing.close(REPLACED_CLOSE_CODE, REPLACED_CLOSE_REASON);
    }
  }

  private send(client: Client | undefined, data: string) {
    if (client?.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

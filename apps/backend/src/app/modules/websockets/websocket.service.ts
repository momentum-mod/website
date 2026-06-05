import cluster from 'node:cluster';
import WebSocket from 'ws';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { JsonValue } from 'type-fest';
import {
  ClusterMessage,
  ClusterMessageType,
  sendClusterMessage
} from '../../../clustered';

type Client = WebSocket.WebSocket;

const WS_BROADCAST_ALL_KEY = 'ws_broadcast_all';
const WS_BROADCAST_USERS_KEY = 'ws_broadcast_users';

interface BroadcastAllPayload {
  key: typeof WS_BROADCAST_ALL_KEY;
  message: JsonValue;
}

interface BroadcastUsersPayload {
  key: typeof WS_BROADCAST_USERS_KEY;
  userIDs: number[];
  message: JsonValue;
}

type PubSubPayload = BroadcastAllPayload | BroadcastUsersPayload;

/**
 * Owns the set of active WebSocket connections for the current worker and
 * provides cluster-aware broadcasting.
 *
 * In a clustered deployment any given user's socket lives on exactly one
 * worker, but the code wanting to message them could be running on any worker.
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

  addClient(userID: number, client: Client) {
    this.activeClients.get(userID)?.close(1008, 'Replaced by new connection');
    this.activeClients.set(userID, client);
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

  private send(client: Client | undefined, data: string) {
    if (client?.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

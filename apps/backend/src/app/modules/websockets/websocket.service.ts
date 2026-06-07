import cluster from 'cluster';
import WebSocket from 'ws';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { JsonValue } from 'type-fest';
import { ClusterMessageType, sendClusterMessage } from '../../../clustered';

type Client = WebSocket.WebSocket;
const WS_BROADCAST_USERS_KEY = 'ws_broadcast_users';
const WS_BROADCAST_ALL_KEY = 'ws_broadcast_all';

@Injectable()
export class WebsocketService implements OnModuleInit {
  private readonly activeClients = new Map<number, Client>();

  onModuleInit() {
    cluster.on('message', (_worker, message: any) => {
      const key = message?.payload?.key;
      if (!key) return;

      if (key === WS_BROADCAST_ALL_KEY) {
        const payloadMessage = message.payload.message;
        for (const client of this.activeClients.values()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payloadMessage);
          }
        }
      } else if (key === WS_BROADCAST_USERS_KEY) {
        const { userIDs, message: payloadMessage } = message.payload;
        for (const userID of userIDs) {
          const client = this.getClient(userID);
          if (client?.readyState === WebSocket.OPEN) {
            client.send(payloadMessage);
          }
        }
      }
    });
  }

  public addClient(userID: number, client: Client) {
    this.activeClients.get(userID)?.close(1008, 'Replaced by new connection');
    this.activeClients.set(userID, client);
  }

  public removeClient(userID: number) {
    this.activeClients.delete(userID);
  }

  public getClient(userID: number): Client | undefined {
    return this.activeClients.get(userID);
  }

  public broadcastToAll(message: JsonValue) {
    // Not treating current worker as a specific case; just send message to self
    // and handle in cb like the rest.
    sendClusterMessage({
      type: ClusterMessageType.PubSub,
      payload: {
        key: WS_BROADCAST_USERS_KEY,
        message
      }
    });
  }

  public broadcastToUsers(userIDs: number[], message: JsonValue) {
    sendClusterMessage({
      type: ClusterMessageType.PubSub,
      payload: {
        key: WS_BROADCAST_USERS_KEY,
        userIDs,
        message
      }
    });
  }
}

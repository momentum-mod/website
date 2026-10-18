import WebSocket from 'ws';

export interface WsMessage<T = any> {
  event: string;
  data: T;
}

/**
 * Error thrown when the WebSocket upgrade handshake is rejected by the server
 * (e.g. a 401 from the auth check in `WebsocketAdapter`). Carries the HTTP
 * status code so tests can assert on it.
 */
export class WsUpgradeError extends Error {
  constructor(public readonly statusCode?: number) {
    super(`WebSocket upgrade rejected${statusCode ? ` (${statusCode})` : ''}`);
    this.name = 'WsUpgradeError';
  }
}

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Minimal WebSocket client for e2e-testing the game connection gateway.
 *
 * The gateway replies to each `{ event, data }` message with a single
 * `{ event, data }` response (the response's `event` matches the request's), so
 * tests drive it sequentially: send a message, await the reply. Incoming
 * messages are buffered so a reply that arrives before `next()` is called isn't
 * lost.
 */
export class WebsocketTestClient {
  private readonly socket: WebSocket;
  private readonly inbox: WsMessage[] = [];
  private readonly waiters: Array<(msg: WsMessage) => void> = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    this.socket.on('message', (raw: WebSocket.RawData) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        return;
      }
      const waiter = this.waiters.shift();
      if (waiter) waiter(msg);
      else this.inbox.push(msg);
    });
  }

  /**
   * Open an authenticated connection. Resolves once the socket is open, or
   * rejects with a {@link WsUpgradeError} if the upgrade is refused (e.g. a bad
   * or non-game token).
   */
  static connect(url: string, token?: string): Promise<WebsocketTestClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, {
        headers: token ? { authorization: `Bearer ${token}` } : {}
      });

      socket.once('open', () => resolve(new WebsocketTestClient(socket)));
      socket.once('unexpected-response', (_req, res) => {
        socket.terminate();
        reject(new WsUpgradeError(res.statusCode));
      });
      socket.once('error', (err) => reject(err));
    });
  }

  send(event: string, data?: unknown): void {
    this.socket.send(JSON.stringify({ event, data: data ?? null }));
  }

  /** Send a message and await the gateway's response. */
  sendAndAwait<T = any>(
    event: string,
    data?: unknown,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<WsMessage<T>> {
    this.send(event, data);
    return this.next<T>(timeoutMs);
  }

  /** Await the next message from the server. */
  next<T = any>(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<WsMessage<T>> {
    const queued = this.inbox.shift();
    if (queued) return Promise.resolve(queued as WsMessage<T>);

    return new Promise<WsMessage<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(waiter);
        if (idx !== -1) this.waiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for WS message (${timeoutMs}ms)`));
      }, timeoutMs);

      const waiter = (msg: WsMessage) => {
        clearTimeout(timer);
        resolve(msg as WsMessage<T>);
      };
      this.waiters.push(waiter);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (
        this.socket.readyState === WebSocket.CLOSED ||
        this.socket.readyState === WebSocket.CLOSING
      ) {
        resolve();
        return;
      }
      this.socket.once('close', () => resolve());
      this.socket.close();
    });
  }
}

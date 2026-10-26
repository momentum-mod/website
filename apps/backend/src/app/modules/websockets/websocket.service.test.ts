import cluster from 'node:cluster';
import { afterEach, describe, it, mock, Mock } from 'node:test';
import * as assert from 'node:assert/strict';
import WebSocket from 'ws';
import { any, wasCalledWith } from '@momentum/test-utils';
import * as clustered from '../../../clustered';
import { ClusterMessageType } from '../../../clustered';
import { isNewerConnection, WebsocketService } from './websocket.service';
import { AuthenticatedWebSocket } from './websocket.adapter';

type MockSocket = AuthenticatedWebSocket & {
  close: Mock<(...args: any[]) => void>;
  send: Mock<(...args: any[]) => void>;
};

describe('WebsocketService', () => {
  // Stands in for a socket on one worker. Each WebsocketService below plays a
  // separate worker, with the cluster's fan-out done by hand via deliver().
  const socket = (
    connectionID: string,
    connectedAt: number,
    readyState: number = WebSocket.OPEN
  ) =>
    ({
      connectionID,
      connectedAt,
      readyState,
      close: mock.fn(),
      send: mock.fn()
    }) as unknown as MockSocket;

  const announce = (
    worker: WebsocketService,
    userID: number,
    { connectionID, connectedAt }: AuthenticatedWebSocket
  ) =>
    worker['deliver']({
      key: 'ws_user_connected',
      userID,
      connectionID,
      connectedAt
    });

  const wasClosed = (client: MockSocket) => client.close.mock.callCount() > 0;

  // Runs the callback as if this process were a cluster worker, capturing what
  // it sends to the primary.
  async function asWorker(
    run: (sent: Mock<(...args: any[]) => void>) => void | Promise<void>
  ) {
    const original = Object.getOwnPropertyDescriptor(cluster, 'isWorker');
    const send = mock.method(clustered, 'sendClusterMessage', () => undefined);
    Object.defineProperty(cluster, 'isWorker', {
      value: true,
      configurable: true,
      writable: true
    });
    try {
      await run(send);
    } finally {
      Object.defineProperty(cluster, 'isWorker', original!);
      send.mock.restore();
    }
  }

  afterEach(() => {
    mock.restoreAll();
  });

  describe('addClient / getClient / removeClient', () => {
    it('should register a user’s connection', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);

      worker.addClient(1, client);

      assert.equal(worker.getClient(1), client);
      assert.equal(worker.getClient(2), undefined);
    });

    it('should close the existing connection when a newer one registers', () => {
      const worker = new WebsocketService();
      const old = socket('a', 1000);
      const newer = socket('b', 2000);
      worker.addClient(1, old);

      worker.addClient(1, newer);

      assert.ok(wasCalledWith(old.close, 1008, any(String)));
      assert.equal(newer.close.mock.callCount(), 0);
      assert.equal(worker.getClient(1), newer);
    });

    it('should close and not register a connection older than the existing one', () => {
      const worker = new WebsocketService();
      const newer = socket('b', 2000);
      const older = socket('a', 1000);
      worker.addClient(1, newer);

      worker.addClient(1, older);

      assert.ok(wasCalledWith(older.close, 1008, any(String)));
      assert.equal(newer.close.mock.callCount(), 0);
      assert.equal(worker.getClient(1), newer);
    });

    it('should keep connections of different users separate', () => {
      const worker = new WebsocketService();
      const first = socket('a', 1000);
      const second = socket('b', 1000);

      worker.addClient(1, first);
      worker.addClient(2, second);

      assert.equal(worker.getClient(1), first);
      assert.equal(worker.getClient(2), second);
      assert.equal(wasClosed(first), false);
      assert.equal(wasClosed(second), false);
    });

    it('should remove a connection that is still the active one', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);

      worker.removeClient(1, client);

      assert.equal(worker.getClient(1), undefined);
    });

    it('should not remove a connection that has since been replaced', () => {
      const worker = new WebsocketService();
      const old = socket('a', 1000);
      const newer = socket('b', 2000);
      worker.addClient(1, old);
      worker.addClient(1, newer);

      // The old socket's close event fires after the newer one registered
      worker.removeClient(1, old);

      assert.equal(worker.getClient(1), newer);
    });

    it('should ignore removing a user with no connection', () => {
      const worker = new WebsocketService();

      assert.doesNotThrow(() => worker.removeClient(1, socket('a', 1000)));
    });
  });

  describe('announcing connections to other workers', () => {
    it('should announce a new connection when running as a worker', async () => {
      await asWorker((send) => {
        const worker = new WebsocketService();

        worker.addClient(1, socket('a', 1000));

        assert.equal(send.mock.callCount(), 1);
        assert.deepEqual(send.mock.calls[0].arguments[0], {
          type: ClusterMessageType.PubSub,
          payload: {
            key: 'ws_user_connected',
            userID: 1,
            connectionID: 'a',
            connectedAt: 1000
          }
        });
      });
    });

    it('should not announce when not running as a worker', () => {
      const send = mock.method(
        clustered,
        'sendClusterMessage',
        () => undefined
      );
      const worker = new WebsocketService();

      worker.addClient(1, socket('a', 1000));

      assert.equal(send.mock.callCount(), 0);
    });

    it('should not announce a connection it closed for being older', async () => {
      await asWorker((send) => {
        const worker = new WebsocketService();
        worker.addClient(1, socket('b', 2000));
        send.mock.resetCalls();

        worker.addClient(1, socket('a', 1000));

        assert.equal(send.mock.callCount(), 0);
      });
    });
  });

  describe('cross-worker connection replacement', () => {
    it("should close this worker's older connection for the user", () => {
      const worker = new WebsocketService();
      const old = socket('a', 1000);
      worker.addClient(1, old);

      announce(worker, 1, socket('b', 2000));

      assert.ok(wasCalledWith(old.close, 1008, any(String)));
    });

    it("should keep this worker's connection if it's the newer one", () => {
      const worker = new WebsocketService();
      const newer = socket('b', 2000);
      worker.addClient(1, newer);

      announce(worker, 1, socket('a', 1000));

      assert.equal(newer.close.mock.callCount(), 0);
    });

    it('should ignore its own announcement', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);

      announce(worker, 1, client);

      assert.equal(client.close.mock.callCount(), 0);
    });

    it("should leave other users' connections alone", () => {
      const worker = new WebsocketService();
      const other = socket('a', 1000);
      worker.addClient(2, other);

      announce(worker, 1, socket('b', 2000));

      assert.equal(other.close.mock.callCount(), 0);
    });

    it('should ignore an announcement for a user with no connection here', () => {
      const worker = new WebsocketService();

      assert.doesNotThrow(() => announce(worker, 1, socket('a', 1000)));
    });

    it('should keep exactly one of two connections opened at the same time', () => {
      const [workerA, workerB] = [
        new WebsocketService(),
        new WebsocketService()
      ];
      const onA = socket('a', 1000);
      const onB = socket('b', 1000);
      workerA.addClient(1, onA);
      workerB.addClient(1, onB);

      // Each worker hears about the other's connection.
      announce(workerA, 1, onB);
      announce(workerB, 1, onA);

      assert.equal(onA.close.mock.callCount() + onB.close.mock.callCount(), 1);
    });

    it('should keep the newer of two connections registered out of order on one worker', () => {
      const worker = new WebsocketService();
      // Opened in the same millisecond, but registered in the opposite order
      // to the one the workers agree on.
      const z = socket('z', 1000);
      const a = socket('a', 1000);
      worker.addClient(1, z);
      worker.addClient(1, a);

      // The announcement of z reaches the worker only now.
      announce(worker, 1, z);
      announce(worker, 1, a);

      assert.equal(z.close.mock.callCount(), 0);
      assert.ok(wasCalledWith(a.close, 1008, any(String)));
      assert.equal(worker.getClient(1), z);
    });
  });

  describe('broadcastToAll', () => {
    it('should send the message to every open connection', () => {
      const worker = new WebsocketService();
      const first = socket('a', 1000);
      const second = socket('b', 1000);
      worker.addClient(1, first);
      worker.addClient(2, second);

      worker.broadcastToAll({ event: 'test', data: { n: 1 } });

      const expected = JSON.stringify({ event: 'test', data: { n: 1 } });
      assert.ok(wasCalledWith(first.send, expected));
      assert.ok(wasCalledWith(second.send, expected));
    });

    it('should skip connections that are not open', () => {
      const worker = new WebsocketService();
      const open = socket('a', 1000);
      const closing = socket('b', 1000, WebSocket.CLOSING);
      const connecting = socket('c', 1000, WebSocket.CONNECTING);
      worker.addClient(1, open);
      worker.addClient(2, closing);
      worker.addClient(3, connecting);

      worker.broadcastToAll('hi');

      assert.equal(open.send.mock.callCount(), 1);
      assert.equal(closing.send.mock.callCount(), 0);
      assert.equal(connecting.send.mock.callCount(), 0);
    });

    it('should not fail with no connections', () => {
      const worker = new WebsocketService();

      assert.doesNotThrow(() => worker.broadcastToAll('hi'));
    });
  });

  describe('broadcastToUsers', () => {
    it('should send the message only to the given users', () => {
      const worker = new WebsocketService();
      const included = socket('a', 1000);
      const alsoIncluded = socket('b', 1000);
      const excluded = socket('c', 1000);
      worker.addClient(1, included);
      worker.addClient(2, alsoIncluded);
      worker.addClient(3, excluded);

      worker.broadcastToUsers([1, 2], { event: 'test' });

      const expected = JSON.stringify({ event: 'test' });
      assert.ok(wasCalledWith(included.send, expected));
      assert.ok(wasCalledWith(alsoIncluded.send, expected));
      assert.equal(excluded.send.mock.callCount(), 0);
    });

    it('should ignore users with no connection on this worker', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);

      assert.doesNotThrow(() => worker.broadcastToUsers([1, 99], 'hi'));

      assert.equal(client.send.mock.callCount(), 1);
    });

    it('should skip a user whose connection is not open', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000, WebSocket.CLOSED);
      worker.addClient(1, client);

      worker.broadcastToUsers([1], 'hi');

      assert.equal(client.send.mock.callCount(), 0);
    });
  });

  describe('as a cluster worker', () => {
    it('should round-trip broadcasts via the primary instead of delivering locally', async () => {
      await asWorker((send) => {
        const worker = new WebsocketService();
        const client = socket('a', 1000);
        worker.addClient(1, client);
        send.mock.resetCalls();

        worker.broadcastToAll({ event: 'all' });
        worker.broadcastToUsers([1], { event: 'users' });

        assert.equal(client.send.mock.callCount(), 0);
        assert.equal(send.mock.callCount(), 2);
        assert.deepEqual(send.mock.calls[0].arguments[0], {
          type: ClusterMessageType.PubSub,
          payload: { key: 'ws_broadcast_all', message: { event: 'all' } }
        });
        assert.deepEqual(send.mock.calls[1].arguments[0], {
          type: ClusterMessageType.PubSub,
          payload: {
            key: 'ws_broadcast_users',
            userIDs: [1],
            message: { event: 'users' }
          }
        });
      });
    });

    it('should deliver broadcasts fanned out by the primary', async () => {
      await asWorker(() => {
        const worker = new WebsocketService();
        const client = socket('a', 1000);
        worker.addClient(1, client);

        worker['deliver']({ key: 'ws_broadcast_all', message: 'hi' });

        assert.ok(wasCalledWith(client.send, JSON.stringify('hi')));
      });
    });
  });

  describe('onModuleInit', () => {
    // Registers the service's process listener, returning it so tests can
    // call it as the cluster would, without leaving it attached.
    function listener(worker: WebsocketService) {
      const on = mock.method(process, 'on', () => process);
      worker.onModuleInit();
      assert.equal(on.mock.callCount(), 1);
      assert.equal(on.mock.calls[0].arguments[0], 'message');
      return on.mock.calls[0].arguments[1] as (message: unknown) => void;
    }

    it('should deliver pub/sub messages from the primary', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);

      listener(worker)({
        type: ClusterMessageType.PubSub,
        payload: { key: 'ws_broadcast_users', userIDs: [1], message: 'hi' }
      });

      assert.ok(wasCalledWith(client.send, JSON.stringify('hi')));
    });

    it('should apply connection announcements from the primary', () => {
      const worker = new WebsocketService();
      const old = socket('a', 1000);
      worker.addClient(1, old);

      listener(worker)({
        type: ClusterMessageType.PubSub,
        payload: {
          key: 'ws_user_connected',
          userID: 1,
          connectionID: 'b',
          connectedAt: 2000
        }
      });

      assert.ok(wasCalledWith(old.close, 1008, any(String)));
    });

    it('should ignore other messages', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);
      const onMessage = listener(worker);

      assert.doesNotThrow(() => {
        onMessage(undefined);
        onMessage({ type: 'something-else', payload: {} });
      });

      assert.equal(client.send.mock.callCount(), 0);
      assert.equal(client.close.mock.callCount(), 0);
    });
  });

  describe('isNewerConnection', () => {
    it('should order by opening time', () => {
      assert.equal(
        isNewerConnection(
          { connectedAt: 2000, connectionID: 'a' },
          { connectedAt: 1000, connectionID: 'z' }
        ),
        true
      );
      assert.equal(
        isNewerConnection(
          { connectedAt: 1000, connectionID: 'z' },
          { connectedAt: 2000, connectionID: 'a' }
        ),
        false
      );
    });

    it('should break ties by connection ID', () => {
      assert.equal(
        isNewerConnection(
          { connectedAt: 1000, connectionID: 'b' },
          { connectedAt: 1000, connectionID: 'a' }
        ),
        true
      );
      assert.equal(
        isNewerConnection(
          { connectedAt: 1000, connectionID: 'a' },
          { connectedAt: 1000, connectionID: 'b' }
        ),
        false
      );
    });

    it('should not consider a connection newer than itself', () => {
      const connection = { connectedAt: 1000, connectionID: 'a' };

      assert.equal(isNewerConnection(connection, connection), false);
    });
  });
});

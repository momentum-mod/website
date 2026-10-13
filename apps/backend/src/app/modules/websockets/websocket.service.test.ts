import { describe, it, mock, Mock } from 'node:test';
import * as assert from 'node:assert/strict';
import { any, wasCalledWith } from '@momentum/test-utils';
import { WebsocketService } from './websocket.service';
import { AuthenticatedWebSocket } from './websocket.adapter';

describe('WebsocketService', () => {
  // Stands in for a socket on one worker. Each WebsocketService below plays a
  // separate worker, with the cluster's fan-out done by hand via deliver().
  const socket = (connectionID: string, connectedAt: number) =>
    ({
      connectionID,
      connectedAt,
      close: mock.fn()
    }) as unknown as AuthenticatedWebSocket & {
      close: Mock<(...args: any[]) => void>;
    };

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
  });
});

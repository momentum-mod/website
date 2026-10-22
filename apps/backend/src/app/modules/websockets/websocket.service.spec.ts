import { WebsocketService } from './websocket.service';
import { AuthenticatedWebSocket } from './websocket.adapter';

describe('WebsocketService', () => {
  // Stands in for a socket on one worker. Each WebsocketService below plays a
  // separate worker, with the cluster's fan-out done by hand via deliver().
  const socket = (connectionID: string, connectedAt: number) =>
    ({
      connectionID,
      connectedAt,
      close: jest.fn()
    }) as unknown as AuthenticatedWebSocket & { close: jest.Mock };

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

      expect(old.close).toHaveBeenCalledWith(1008, expect.any(String));
    });

    it("should keep this worker's connection if it's the newer one", () => {
      const worker = new WebsocketService();
      const newer = socket('b', 2000);
      worker.addClient(1, newer);

      announce(worker, 1, socket('a', 1000));

      expect(newer.close).not.toHaveBeenCalled();
    });

    it('should ignore its own announcement', () => {
      const worker = new WebsocketService();
      const client = socket('a', 1000);
      worker.addClient(1, client);

      announce(worker, 1, client);

      expect(client.close).not.toHaveBeenCalled();
    });

    it("should leave other users' connections alone", () => {
      const worker = new WebsocketService();
      const other = socket('a', 1000);
      worker.addClient(2, other);

      announce(worker, 1, socket('b', 2000));

      expect(other.close).not.toHaveBeenCalled();
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

      expect(onA.close.mock.calls.length + onB.close.mock.calls.length).toBe(1);
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

      expect(z.close).not.toHaveBeenCalled();
      expect(a.close).toHaveBeenCalledWith(1008, expect.any(String));
      expect(worker.getClient(1)).toBe(z);
    });

    it('should close a connection registered after a newer one', () => {
      const worker = new WebsocketService();
      const newer = socket('b', 2000);
      const older = socket('a', 1000);
      worker.addClient(1, newer);

      worker.addClient(1, older);

      expect(older.close).toHaveBeenCalledWith(1008, expect.any(String));
      expect(newer.close).not.toHaveBeenCalled();
      expect(worker.getClient(1)).toBe(newer);
    });
  });
});

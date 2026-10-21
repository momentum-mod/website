import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { KillswitchType, Killswitches } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { mockDeep } from '@momentum/test-utils';
import { FIRST_WORKER_ENV_VAR } from '../../../clustered';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import {
  KILLSWITCH_CONFIG_ID,
  KILLSWITCH_VALKEY_KEY,
  KillswitchService
} from './killswitch.service';

type MockedDatabase = {
  config: {
    findUnique: any;
    upsert: any;
  };
};

type MockedValkey = {
  hget: any;
  hgetall: any;
  hset: any;
};

const defaultSwitches: Killswitches = {
  NEW_SIGNUPS: false,
  RUN_SUBMISSION: false,
  MAP_SUBMISSION: false,
  MAP_REVIEWS: false
};

function createFixture(storedConfig: unknown = defaultSwitches) {
  const db = mockDeep<ExtendedPrismaService>() as unknown as MockedDatabase;
  const valkey = mockDeep<ValkeyService>() as unknown as MockedValkey;
  const state = new Map<string, string>();

  db.config.findUnique.mock.mockImplementation(async () => ({
    id: KILLSWITCH_CONFIG_ID,
    value: storedConfig
  }));
  valkey.hget.mock.mockImplementation(
    async (_key, field) => state.get(field) ?? null
  );
  valkey.hgetall.mock.mockImplementation(async () => Object.fromEntries(state));
  valkey.hset.mock.mockImplementation(async (_key, ...entries) => {
    for (let i = 0; i < entries.length; i += 2) {
      state.set(String(entries[i]), String(entries[i + 1]));
    }
    return entries.length / 2;
  });

  const service = new KillswitchService(
    db as unknown as ExtendedPrismaService,
    valkey as unknown as ValkeyService
  );

  return { service, db, valkey, state };
}

async function withWorkerFlag(
  value: string | undefined,
  callback: () => Promise<void>
): Promise<void> {
  const originalValue = process.env[FIRST_WORKER_ENV_VAR];
  if (value === undefined) {
    delete process.env[FIRST_WORKER_ENV_VAR];
  } else {
    process.env[FIRST_WORKER_ENV_VAR] = value;
  }

  try {
    await callback();
  } finally {
    if (originalValue === undefined) {
      delete process.env[FIRST_WORKER_ENV_VAR];
    } else {
      process.env[FIRST_WORKER_ENV_VAR] = originalValue;
    }
  }
}

describe('KillswitchService', () => {
  it('loads the Postgres state into Valkey on the first worker', async () => {
    await withWorkerFlag(undefined, async () => {
      const storedSwitches = { ...defaultSwitches, MAP_SUBMISSION: true };
      const { service, db, valkey, state } = createFixture(storedSwitches);
      state.set(KillswitchType.MAP_SUBMISSION, 'false');

      await service.onModuleInit();

      assert.deepEqual(await service.getKillSwitches(), storedSwitches);
      assert.equal(db.config.findUnique.mock.calls.length, 1);
      assert.deepEqual(valkey.hset.mock.calls[0].arguments, [
        KILLSWITCH_VALKEY_KEY,
        'NEW_SIGNUPS',
        'false',
        'RUN_SUBMISSION',
        'false',
        'MAP_SUBMISSION',
        'true',
        'MAP_REVIEWS',
        'false'
      ]);
    });
  });

  it('skips initialization on workers other than the first', async () => {
    await withWorkerFlag('false', async () => {
      const { service, db, valkey } = createFixture();

      await service.onModuleInit();

      assert.equal(db.config.findUnique.mock.calls.length, 0);
      assert.equal(valkey.hset.mock.calls.length, 0);
    });
  });

  it('falls back to all-disabled state when the stored configuration is invalid', async () => {
    await withWorkerFlag(undefined, async () => {
      const { service, state } = createFixture({
        ...defaultSwitches,
        MAP_SUBMISSION: 'enabled'
      });

      await service.onModuleInit();

      assert.deepEqual(await service.getKillSwitches(), defaultSwitches);
      assert.deepEqual(
        Object.fromEntries(
          Enum.values(KillswitchType).map((type) => [type, state.get(type)])
        ),
        Object.fromEntries(
          Enum.values(KillswitchType).map((type) => [type, 'false'])
        )
      );
    });
  });

  it('reads individual switch values from Valkey', async () => {
    const { service, state, valkey } = createFixture();
    state.set(KillswitchType.NEW_SIGNUPS, 'true');
    state.set(KillswitchType.RUN_SUBMISSION, 'false');
    state.set(KillswitchType.MAP_SUBMISSION, 'invalid');

    assert.equal(
      await service.checkKillswitch(KillswitchType.NEW_SIGNUPS),
      true
    );
    assert.equal(
      await service.checkKillswitch(KillswitchType.RUN_SUBMISSION),
      false
    );
    assert.equal(
      await service.checkKillswitch(KillswitchType.MAP_SUBMISSION),
      false
    );
    assert.equal(
      await service.checkKillswitch(KillswitchType.MAP_REVIEWS),
      false
    );
    assert.equal(valkey.hget.mock.calls.length, 4);
  });

  it('returns every switch and treats missing or invalid values as disabled', async () => {
    const { service, state } = createFixture();
    state.set(KillswitchType.NEW_SIGNUPS, 'true');
    state.set(KillswitchType.MAP_SUBMISSION, 'not-a-boolean');

    assert.deepEqual(await service.getKillSwitches(), {
      NEW_SIGNUPS: true,
      RUN_SUBMISSION: false,
      MAP_SUBMISSION: false,
      MAP_REVIEWS: false
    });
  });

  it('updates only supplied switches in Valkey', async () => {
    const { service, state, valkey } = createFixture();
    state.set(KillswitchType.NEW_SIGNUPS, 'true');
    state.set(KillswitchType.RUN_SUBMISSION, 'false');
    state.set(KillswitchType.MAP_SUBMISSION, 'true');
    state.set(KillswitchType.MAP_REVIEWS, 'false');

    await service.updateKillswitches({
      MAP_SUBMISSION: false,
      MAP_REVIEWS: true
    });

    assert.deepEqual(await service.getKillSwitches(), {
      NEW_SIGNUPS: true,
      RUN_SUBMISSION: false,
      MAP_SUBMISSION: false,
      MAP_REVIEWS: true
    });
    assert.deepEqual(valkey.hset.mock.calls[0].arguments, [
      KILLSWITCH_VALKEY_KEY,
      'MAP_SUBMISSION',
      'false',
      'MAP_REVIEWS',
      'true'
    ]);
  });

  it('persists the full merged state to Postgres on update', async () => {
    const { service, state, db } = createFixture();
    state.set(KillswitchType.NEW_SIGNUPS, 'true');

    await service.updateKillswitches({ RUN_SUBMISSION: true });

    const expected = {
      ...defaultSwitches,
      NEW_SIGNUPS: true,
      RUN_SUBMISSION: true
    };
    assert.equal(db.config.upsert.mock.calls.length, 1);
    assert.deepEqual(db.config.upsert.mock.calls[0].arguments, [
      {
        where: { id: KILLSWITCH_CONFIG_ID },
        update: { value: expected },
        create: { id: KILLSWITCH_CONFIG_ID, value: expected }
      }
    ]);
  });

  it('restores updated state from Postgres after a restart', async () => {
    await withWorkerFlag(undefined, async () => {
      const first = createFixture();
      await first.service.updateKillswitches({ RUN_SUBMISSION: true });
      const persisted = first.db.config.upsert.mock.calls[0].arguments[0].update
        .value as Killswitches;

      const second = createFixture(persisted);
      await second.service.onModuleInit();

      assert.equal(
        await second.service.checkKillswitch(KillswitchType.RUN_SUBMISSION),
        true
      );
    });
  });

  it('does not write anywhere for an empty update', async () => {
    const { service, valkey, db } = createFixture();

    await service.updateKillswitches({});

    assert.equal(valkey.hset.mock.calls.length, 0);
    assert.equal(db.config.upsert.mock.calls.length, 0);
  });

  it('rejects unknown switch names and non-boolean values', async () => {
    const { service, valkey, db } = createFixture();
    const invalidUpdates: unknown[] = [
      { UNKNOWN_SWITCH: true },
      { MAP_SUBMISSION: 'true' },
      { MAP_SUBMISSION: null },
      null,
      []
    ];

    for (const update of invalidUpdates) {
      await assert.rejects(
        service.updateKillswitches(update as Partial<Killswitches>),
        BadRequestException
      );
    }

    assert.equal(valkey.hset.mock.calls.length, 0);
    assert.equal(db.config.upsert.mock.calls.length, 0);
  });

  it('resets all switches to disabled', async () => {
    const { service, state, valkey } = createFixture();
    for (const type of Enum.values(KillswitchType)) {
      state.set(type, 'true');
    }

    await service.resetAllKillswitches();

    assert.deepEqual(await service.getKillSwitches(), defaultSwitches);
    assert.equal(valkey.hset.mock.calls.length, 1);
  });
});

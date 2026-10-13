// Run session WebSocket concurrency tests against the clustered isolated backend.
//   node rs-race.mjs <test> [...]   tests: ordering dupcreate reconnect leak dualcreate load
import { Client, pool, sleep, summarize, valkey } from './common.mjs';

const vk = valkey();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const MAIN = { mapID: 1, gamemode: 2, trackType: 0, trackNum: 1 };
const STAGE = (n) => ({ mapID: 1, gamemode: 2, trackType: 1, trackNum: n });

async function create(c, track = MAIN) {
  const { data } = await c.request('runsession.create', track);
  if (data?.error) throw new Error(data.error);
  return data.id;
}

/** Timestamps stored for a session, oldest first (lpush stores newest first). */
async function timestamps(sessionID) {
  return (await vk.lrange(`runsess:ts:${sessionID}`, 0, -1)).reverse().map((s) => s.split(',').map(Number));
}

/** Expect minorNums 1..n in order (major 1), with server createdAt non-decreasing. */
function checkOrder(ts, n) {
  if (ts.length !== n) return `expected ${n} timestamps, got ${ts.length}`;
  for (let i = 0; i < n; i++) {
    if (ts[i][1] !== i + 1) return `position ${i} has minor ${ts[i][1]}`;
    if (i && ts[i][3] < ts[i - 1][3]) return `createdAt went backwards at ${i}`;
  }
  return null;
}

const tests = {
  // Many clients streaming updates without waiting for acks; each session must keep send order.
  async ordering(base = 200_000, n = 300, updates = 50) {
    const bad = [];
    await pool([...Array(n).keys()], 50, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      const id = await create(c);
      for (let m = 2; m <= updates; m++) c.send('runsession.update', { sessionID: id, majorNum: 1, minorNum: m, time: m * 0.1 });
      await c.request('runsession.update', { sessionID: id, majorNum: 1, minorNum: updates + 1, time: (updates + 1) * 0.1 });
      const err = checkOrder(await timestamps(id), updates + 1);
      if (err) bad.push({ uid: c.userID, err });
      await c.close();
    });
    log(`ordering: ${n - bad.length}/${n} sessions in exact order (${n * updates} updates)`, bad.slice(0, 5));
  },

  // Several creates for the same track fired at once on one connection: one session must remain.
  async dupcreate(base = 210_000, n = 200) {
    const res = { one: 0, more: 0, none: 0 };
    let extraKeys = 0;
    await pool([...Array(n).keys()], 50, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      const ids = await Promise.all(Array.from({ length: 5 }, () => create(c)));
      const list = await vk.lrange(`runsess:id:${c.userID}`, 0, -1);
      res[list.length === 1 ? 'one' : list.length ? 'more' : 'none']++;
      for (const id of ids) if (!list.includes(String(id)) && (await vk.exists(`runsess:dat:${id}`, `runsess:ts:${id}`))) extraKeys++;
      await c.close();
    });
    log('dupcreate (5 concurrent creates, same track, one connection) ->', JSON.stringify(res), `orphaned keys of replaced sessions: ${extraKeys}`);
  },

  // The same, but from two connections opened together (one is closed by the replacement fix).
  async dualcreate(base = 220_000, n = 200) {
    const res = { one: 0, more: 0, none: 0 };
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const pair = [new Client(uid), new Client(uid)];
      await Promise.all(pair.map((c) => c.connect()));
      await Promise.all(pair.map((c) => create(c).catch(() => null)));
      await sleep(300);
      const list = await vk.lrange(`runsess:id:${uid}`, 0, -1);
      res[list.length === 1 ? 'one' : list.length ? 'more' : 'none']++;
      await Promise.all(pair.map((c) => c.close()));
    });
    log('dualcreate (two connections create on the same track at once) ->', JSON.stringify(res));
  },

  // Connection drops mid-run and the client continues the session on a new connection (likely another worker).
  async reconnect(base = 230_000, n = 200) {
    const bad = [];
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const c1 = new Client(uid);
      await c1.connect();
      const id = await create(c1);
      for (let m = 2; m <= 10; m++) await c1.request('runsession.update', { sessionID: id, majorNum: 1, minorNum: m, time: m });
      const c2 = new Client(uid);
      await c2.connect();
      for (let m = 11; m <= 20; m++) {
        const { data } = await c2.request('runsession.update', { sessionID: id, majorNum: 1, minorNum: m, time: m });
        if (data?.error) { bad.push({ uid, err: data.error }); break; }
      }
      const err = checkOrder(await timestamps(id), 20);
      if (err) bad.push({ uid, err });
      await Promise.all([c1.close(), c2.close()]);
    });
    log(`reconnect mid-run: ${n - bad.length}/${n} sessions intact and in order`, bad.slice(0, 5));
  },

  // Clients that vanish mid-run: what's left in Valkey, and does it ever expire?
  async leak(base = 240_000, n = 300) {
    const ids = [];
    await pool([...Array(n).keys()], 50, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      const id = await create(c, i % 2 ? MAIN : STAGE(1 + (i % 3)));
      ids.push(id);
      if (i % 3) for (let m = 2; m <= 4; m++) await c.request('runsession.update', { sessionID: id, majorNum: 1, minorNum: m, time: m });
      if (i % 2) c.terminate(); else await c.close();
    });
    await sleep(2000);
    let left = 0, noTTL = 0;
    for (const id of ids) {
      for (const key of [`runsess:dat:${id}`, `runsess:ts:${id}`]) {
        if (await vk.exists(key)) { left++; if ((await vk.ttl(key)) === -1) noTTL++; }
      }
    }
    const idLists = (await Promise.all([...Array(n).keys()].map((i) => vk.exists(`runsess:id:${base + i}`)))).filter(Boolean).length;
    log(`leak: ${left}/${ids.length * 2} session keys left after disconnect, ${noTTL} with no expiry; ${idLists}/${n} users' session lists left`);
  },

  // Throughput: many runners sending splits at game-like rates.
  async load(base = 250_000, n = 3000, seconds = 30, updatesPerSec = 2) {
    const clients = await pool([...Array(n).keys()], 100, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      c.sessionID = await create(c);
      c.minor = 1;
      return c;
    });
    const lat = [];
    const end = Date.now() + seconds * 1000;
    await Promise.all(clients.map(async (c) => {
      await sleep(Math.random() * 1000);
      while (Date.now() < end) {
        c.minor++;
        const { ms, data } = await c.request('runsession.update', { sessionID: c.sessionID, majorNum: 1, minorNum: c.minor, time: c.minor });
        if (data?.error) throw new Error(data.error);
        lat.push(ms);
        await sleep(1000 / updatesPerSec);
      }
    }));
    let bad = 0;
    for (const c of clients) if (checkOrder(await timestamps(c.sessionID), c.minor)) bad++;
    log(`load: ${n} runners, ${lat.length} updates in ${seconds}s (${(lat.length / seconds).toFixed(0)}/s), latency ${JSON.stringify(summarize(lat))}; ${bad} sessions out of order`);
    await Promise.all(clients.map((c) => c.close()));
  }
};

for (const name of process.argv.slice(2)) {
  log(`=== ${name}`);
  await tests[name]();
}
await vk.quit();
process.exit(0);

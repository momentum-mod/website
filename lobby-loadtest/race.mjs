// Concurrency/race tests against the clustered isolated backend.
//   node race.mjs <test> [...]    tests: handoff stale close churn counts flush
import { Client, checkInvariants, pool, scanAll, sleep, status, valkey } from './common.mjs';

const vk = valkey();
const REFRESH_CYCLE_MS = 65_000; // every status refreshed at least once (60s cycle + slack)
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function userHash(uid) {
  const h = await vk.hgetall(`lobby:user:${uid}`);
  return h?.lobbyID ? h : null;
}

/** Open a 2nd connection for a user and report whether it landed on the same worker. */
async function secondConnection(uid, first) {
  const second = new Client(uid);
  await second.connect();
  await sleep(250);
  // addClient closes the older socket only on the same worker
  return { second, sameWorker: first.closeCode === 1008 };
}

const tests = {
  // Reconnect: the new connection takes over, then the old one closes.
  async handoff(base = 10_000, n = 200) {
    const outcomes = { same: { ok: 0, bad: 0 }, cross: { ok: 0, bad: 0 } };
    const bad = [];
    const keep = [];
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const c1 = new Client(uid);
      await c1.connect();
      await c1.request('lobby.update', status({ lobbyID: `${uid}01` }));
      const { second: c2, sameWorker } = await secondConnection(uid, c1);
      await c2.request('lobby.update', status({ lobbyID: `${uid}02` }));
      await c1.close();
      await sleep(300);
      const h = await userHash(uid);
      const ok = h?.lobbyID === `${uid}02`;
      outcomes[sameWorker ? 'same' : 'cross'][ok ? 'ok' : 'bad']++;
      if (!ok) bad.push({ uid, sameWorker, got: h?.lobbyID ?? null });
      keep.push(c2);
    });
    log('handoff immediately after:', JSON.stringify(outcomes), bad.slice(0, 5));
    log(`waiting ${REFRESH_CYCLE_MS / 1000}s for a full refresh cycle...`);
    await sleep(REFRESH_CYCLE_MS);
    let still = 0;
    for (const c of keep) if ((await userHash(c.userID))?.lobbyID === `${c.userID}02`) still++;
    const inv = await checkInvariants(vk);
    log(`after refresh cycle: ${still}/${keep.length} still correct; invariant violations: ${inv.violations.length}`, inv.violations.slice(0, 5));
    await Promise.all(keep.map((c) => c.close()));
  },

  // The old connection is still alive and reports after the new one has.
  async stale(base = 20_000, n = 200) {
    const res = { cross: { new: 0, old: 0, none: 0 }, sameWorker: 0 };
    const keep = [];
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const c1 = new Client(uid);
      await c1.connect();
      await c1.request('lobby.update', status({ lobbyID: `${uid}01` }));
      const { second: c2, sameWorker } = await secondConnection(uid, c1);
      keep.push(c2);
      if (sameWorker) { res.sameWorker++; return; }
      await c2.request('lobby.update', status({ lobbyID: `${uid}02` }));
      await c1.request('lobby.update', status({ lobbyID: `${uid}03` })); // stale client still talking
      await c1.close();
      await sleep(300);
      const h = await userHash(uid);
      res.cross[h?.lobbyID === `${uid}02` ? 'new' : h ? 'old' : 'none']++;
    });
    log('stale write from old connection, then it closes ->', JSON.stringify(res),
      '(new = live connection\'s status kept; none = user vanished although connected)');
    await Promise.all(keep.map((c) => c.close()));
  },

  // After the fix: a new connection anywhere closes the old one, so it can't report afterwards.
  async replace(base = 70_000, n = 200) {
    const res = { oldClosed: 0, oldStillOpen: 0, final: { new: 0, old: 0, none: 0 } };
    const keep = [];
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const c1 = new Client(uid);
      await c1.connect();
      await c1.request('lobby.update', status({ lobbyID: `${uid}01` }));
      const c2 = new Client(uid);
      await c2.connect();
      keep.push(c2);
      await sleep(250);
      c1.open ? res.oldStillOpen++ : res.oldClosed++;
      await c2.request('lobby.update', status({ lobbyID: `${uid}02` }));
      if (c1.open) {
        await c1.request('lobby.update', status({ lobbyID: `${uid}03` })).catch(() => {});
        await c1.close();
      }
      await sleep(300);
      const h = await userHash(uid);
      res.final[h?.lobbyID === `${uid}02` ? 'new' : h ? 'old' : 'none']++;
    });
    const stillOpen = keep.filter((c) => c.open).length;
    log('replace ->', JSON.stringify(res), `new connections still open: ${stillOpen}/${n}`);
    await Promise.all(keep.map((c) => c.close()));
  },

  // Two connections for a user opening at the same moment: exactly one must survive.
  async simultaneous(base = 80_000, n = 200) {
    const outcome = { one: 0, both: 0, none: 0 };
    const all = [];
    await pool([...Array(n).keys()], 25, async (i) => {
      const uid = base + i;
      const pair = [new Client(uid), new Client(uid)];
      await Promise.all(pair.map((c) => c.connect()));
      all.push(...pair);
      await sleep(500);
      const open = pair.filter((c) => c.open).length;
      outcome[open === 1 ? 'one' : open === 2 ? 'both' : 'none']++;
    });
    log('simultaneous ->', JSON.stringify(outcome));
    await Promise.all(all.map((c) => c.close()));
  },

  // Connections that send updates and close/terminate straight away must leave nothing behind.
  async close(base = 30_000, n = 400) {
    const ids = [...Array(n).keys()].map((i) => base + i);
    await pool(ids, 50, async (uid, i) => {
      const c = new Client(uid);
      await c.connect();
      const k = 1 + (i % 5);
      for (let j = 0; j < k; j++) c.send('lobby.update', status({ lobbyID: `${uid}0${j}`, isMapLobby: j % 2 === 0, mapID: 1 + (uid % 7), gamemode: 1 }));
      if (i % 2) c.terminate(); else c.ws.close();
    });
    await sleep(2000);
    const left = async () => (await Promise.all(ids.map(userHash))).filter(Boolean).length;
    log(`close race: ${await left()}/${n} statuses left 2s after closing`);
    log(`waiting ${REFRESH_CYCLE_MS / 1000}s to see if refresh keeps any alive...`);
    await sleep(REFRESH_CYCLE_MS);
    const inv = await checkInvariants(vk);
    log(`close race: ${await left()}/${n} statuses left after a refresh cycle; violations: ${inv.violations.length}`, inv.violations.slice(0, 5));
  },

  // Many clients changing lobbies at once while refresh ticks run; Valkey must end up matching each client's last report.
  async churn(base = 40_000, n = 400, ops = 30) {
    const clients = await pool([...Array(n).keys()], 50, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      return c;
    });
    const expected = new Map();
    const t0 = Date.now();
    await Promise.all(clients.map(async (c) => {
      for (let j = 0; j < ops; j++) {
        const r = Math.random();
        if (r < 0.15) { c.send('lobby.leave', {}); expected.set(c.userID, null); }
        else {
          const lobby = Math.floor(Math.random() * 40);
          const isMap = lobby < 24;
          const s = status({ lobbyID: `9${lobby}`, isMapLobby: isMap, mapID: isMap ? 1 + (lobby % 12) : undefined, gamemode: isMap ? 1 + (lobby % 3) : undefined });
          c.send('lobby.update', s);
          expected.set(c.userID, s);
        }
        if (Math.random() < 0.3) c.send('lobby.mapcounts', { gamemode: 1 + (j % 3) });
        await sleep(Math.random() * 1000);
      }
      // round trip flushes this connection's queue (handled in order)
      await c.request('lobby.mapcounts', { gamemode: 1 });
    }));
    log(`churn: ${n * ops} ops over ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    const check = async (label) => {
      let mismatch = 0;
      const ex = [];
      for (const [uid, s] of expected) {
        const h = await userHash(uid);
        const ok = s === null ? h === null : h && h.lobbyID === s.lobbyID && (h.isMapLobby === '1') === s.isMapLobby && (s.mapID ? h.mapID === String(s.mapID) && h.gamemode === String(s.gamemode) : !h.mapID);
        if (!ok) { mismatch++; if (ex.length < 5) ex.push({ uid, want: s?.lobbyID ?? null, got: h?.lobbyID ?? null }); }
      }
      const inv = await checkInvariants(vk);
      log(`churn ${label}: ${mismatch}/${expected.size} mismatched; invariant violations: ${inv.violations.length}`, ex, inv.violations.slice(0, 5));
    };
    await check('immediately');
    log(`waiting ${REFRESH_CYCLE_MS / 1000}s for a refresh cycle...`);
    await sleep(REFRESH_CYCLE_MS);
    await check('after refresh cycle');
    await Promise.all(clients.map((c) => c.close()));
    await sleep(1500);
    const left = (await Promise.all(clients.map((c) => userHash(c.userID)))).filter(Boolean).length;
    log(`churn: ${left} statuses left after all closed`);
  },

  // Every worker returns the same, correct counts.
  async counts(base = 50_000) {
    // map m (1..10) gets 2*m players, gamemode 1, spread over lobbies of 4
    const plan = [];
    for (let m = 1; m <= 10; m++) for (let k = 0; k < 2 * m; k++) plan.push({ mapID: m, lobby: `7${m}${Math.floor(k / 4)}` });
    const clients = await pool(plan, 50, async (p, i) => {
      const c = new Client(base + i);
      await c.connect();
      await c.request('lobby.update', status({ lobbyID: p.lobby, isMapLobby: true, mapID: p.mapID, gamemode: 1 }));
      return c;
    });
    await sleep(5500); // past the per-worker counts cache
    const want = JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ mapID: i + 1, count: 2 * (i + 1) })));
    const answers = await Promise.all(clients.map(async (c) => {
      const { data } = await c.request('lobby.mapcounts', { gamemode: 1 });
      return JSON.stringify([...data.counts].sort((a, b) => a.mapID - b.mapID));
    }));
    const wrong = answers.filter((a) => a !== want);
    log(`counts: ${answers.length - wrong.length}/${answers.length} correct`, wrong.slice(0, 2));
    await Promise.all(clients.map((c) => c.close()));
  },

  // Valkey loses its data (restart/flush) while players stay connected.
  async flush(base = 60_000, n = 200) {
    const clients = await pool([...Array(n).keys()], 50, async (i) => {
      const c = new Client(base + i);
      await c.connect();
      await c.request('lobby.update', status({ lobbyID: `8${i % 50}`, isMapLobby: true, mapID: 1 + (i % 5), gamemode: 2 }));
      return c;
    });
    const count = async () => (await Promise.all(clients.map((c) => userHash(c.userID)))).filter(Boolean).length;
    log(`flush: ${await count()}/${n} statuses before FLUSHALL`);
    await vk.flushall();
    log(`waiting ${REFRESH_CYCLE_MS / 1000}s for a refresh cycle...`);
    await sleep(REFRESH_CYCLE_MS);
    const { data } = await clients[0].request('lobby.mapcounts', { gamemode: 2 });
    log(`flush: ${await count()}/${n} statuses restored by refresh; map counts now`, JSON.stringify(data.counts));
    await Promise.all(clients.map((c) => c.close()));
  }
};

for (const name of process.argv.slice(2)) {
  log(`=== ${name}`);
  await tests[name]();
}
await vk.quit();
process.exit(0);

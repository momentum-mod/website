// Lobby load test. Coordinator forks client processes and samples Valkey + backend CPU per phase.
//   node lt.mjs <clients> <procs> <churnPerSec> <countsPerSec> <steadySec> <idleSec> <label>
import { fork, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { Client, pool, sleep, status, summarize, valkey } from './common.mjs';

const MAPS = 300;
const randomStatus = (uid) => {
  const isMap = Math.random() < 0.7;
  if (!isMap) return status({ lobbyID: `5${Math.floor(Math.random() * 100000)}` });
  const mapID = 1 + Math.floor(Math.random() ** 2 * MAPS); // popular maps get most players
  return status({ lobbyID: `6${mapID}${Math.floor(Math.random() * 20)}`, isMapLobby: true, mapID, gamemode: 1 + (mapID % 3) });
};

// ---------------- child: owns a slice of clients ----------------
if (process.argv[2] === 'child') {
  const [base, n] = process.argv.slice(3).map(Number);
  let clients = [];
  const lat = { connect: [], initial: [], churn: [], counts: [] };
  const errors = {};
  const err = (k, e) => { const key = `${k}: ${e.message}`; errors[key] = (errors[key] ?? 0) + 1; };

  process.on('message', async (msg) => {
    if (msg.cmd === 'connect') {
      clients = (await pool([...Array(n).keys()], 100, async (i) => {
        const c = new Client(base + i);
        try { lat.connect.push(await c.connect(30000)); return c; } catch (e) { err('connect', e); return null; }
      })).filter(Boolean);
    } else if (msg.cmd === 'initial') {
      await Promise.all(clients.map(async (c) => {
        try { const r = await c.request('lobby.update', randomStatus(c.userID)); lat.initial.push(r.ms); } catch (e) { err('initial', e); }
      }));
    } else if (msg.cmd === 'steady') {
      const { churnPerSec, countsPerSec, seconds } = msg;
      const end = Date.now() + seconds * 1000;
      const inflight = [];
      const tick = 20; // ms
      let churnAcc = 0, countsAcc = 0;
      let last = performance.now();
      while (Date.now() < end) {
        const now = performance.now();
        churnAcc += (churnPerSec * (now - last)) / 1000;
        countsAcc += (countsPerSec * (now - last)) / 1000;
        last = now;
        for (; churnAcc >= 1; churnAcc--) {
          const c = clients[Math.floor(Math.random() * clients.length)];
          const p = Math.random() < 0.1 ? c.request('lobby.leave', {}) : c.request('lobby.update', randomStatus(c.userID));
          inflight.push(p.then((r) => lat.churn.push(r.ms), (e) => err('churn', e)));
        }
        for (; countsAcc >= 1; countsAcc--) {
          const c = clients[Math.floor(Math.random() * clients.length)];
          inflight.push(c.request('lobby.mapcounts', { gamemode: 1 + Math.floor(Math.random() * 3) }).then((r) => lat.counts.push(r.ms), (e) => err('counts', e)));
        }
        await sleep(tick);
      }
      await Promise.all(inflight);
    } else if (msg.cmd === 'report') {
      const closedUnexpectedly = clients.filter((c) => !c.open).length;
      process.send({ lat: Object.fromEntries(Object.entries(lat).map(([k, v]) => [k, v])), errors, closedUnexpectedly, connected: clients.length });
      for (const k of Object.keys(lat)) lat[k] = [];
      return;
    } else if (msg.cmd === 'close') {
      await Promise.all(clients.map((c) => c.close()));
      process.exit(0);
    }
    process.send({ done: msg.cmd });
  });
} else {
  // ---------------- coordinator ----------------
  const [N, P, churnPerSec, countsPerSec, steadySec, idleSec] = process.argv.slice(2, 8).map(Number);
  const label = process.argv[8] ?? '';
  const vk = valkey();
  const here = fileURLToPath(import.meta.url);
  const per = Math.ceil(N / P);
  const kids = Array.from({ length: P }, (_, i) => fork(here, ['child', String(100_000 + i * per), String(Math.min(per, N - i * per))]));

  // Backend processes to measure CPU for: the cluster workers start-backend.sh
  // logged, or in single-process mode whatever is listening on :3100.
  // CPU sampling uses PowerShell, so it's Windows-only; elsewhere it reads 0.
  const workerPids = (() => {
    const log = readFileSync(new URL('./backend.log', import.meta.url), 'utf8');
    const workers = [...log.matchAll(/Worker process (\d+) started/g)].map((m) => m[1]);
    if (workers.length) return workers;
    const listening = execSync('netstat -ano').toString().split(/\r?\n/).find((l) => /:3100\s.*LISTENING/.test(l));
    return listening ? [listening.trim().split(/\s+/).pop()] : [];
  })();
  const backendCpu = () => {
    try {
      const out = execSync(`powershell -NoProfile -Command "(Get-Process -Id ${workerPids.join(',')} | Measure-Object CPU -Sum).Sum"`).toString().trim();
      return Number(out);
    } catch {
      return 0;
    }
  };
  const vkInfo = async () => {
    const info = await vk.info('all');
    const get = (k) => Number(info.match(new RegExp(`^${k}:([\\d.]+)`, 'm'))?.[1]);
    const cmds = {};
    for (const m of info.matchAll(/^cmdstat_(\w+):calls=(\d+),usec=(\d+)/gm)) cmds[m[1]] = { calls: +m[2], usec: +m[3] };
    return { cpu: get('used_cpu_sys') + get('used_cpu_user'), mem: get('used_memory'), cmds };
  };
  const all = (cmd, extra = {}) => Promise.all(kids.map((k) => new Promise((res) => {
    k.once('message', res);
    k.send({ cmd, ...extra });
  })));

  const results = { label, N, workers: workerPids.length, phases: {} };
  const phase = async (name, run) => {
    await vk.config('RESETSTAT');
    const v0 = await vkInfo(); const b0 = backendCpu(); const t0 = performance.now();
    await run();
    const secs = (performance.now() - t0) / 1000;
    const v1 = await vkInfo(); const b1 = backendCpu();
    const reports = await all('report');
    const lat = {};
    for (const r of reports) for (const [k, v] of Object.entries(r.lat)) (lat[k] ??= []).push(...v);
    const errors = {};
    for (const r of reports) for (const [k, v] of Object.entries(r.errors)) errors[k] = (errors[k] ?? 0) + v;
    const valkeyCalls = Object.fromEntries(Object.entries(v1.cmds).map(([k, v]) => [k, { calls: v.calls, perSec: +(v.calls / secs).toFixed(1), usecPerCall: +(v.usec / v.calls).toFixed(1) }]));
    results.phases[name] = {
      seconds: +secs.toFixed(1),
      latencyMs: Object.fromEntries(Object.entries(lat).filter(([, v]) => v.length).map(([k, v]) => [k, summarize(v)])),
      errors,
      closedUnexpectedly: reports.reduce((a, r) => a + r.closedUnexpectedly, 0),
      connected: reports.reduce((a, r) => a + r.connected, 0),
      valkey: { cpuPct: +(((v1.cpu - v0.cpu) / secs) * 100).toFixed(1), memMB: +(v1.mem / 1048576).toFixed(1), calls: valkeyCalls },
      backendCpuPct: +(((b1 - b0) / secs) * 100).toFixed(1)
    };
    console.log(name, JSON.stringify(results.phases[name]));
  };

  await phase('connect', () => all('connect'));
  await phase('initialBurst', () => all('initial'));
  if (idleSec > 0) await phase('idle', () => sleep(idleSec * 1000));
  if (steadySec > 0) await phase('steady', () => all('steady', { churnPerSec: churnPerSec / P, countsPerSec: countsPerSec / P, seconds: steadySec }));
  const users = (await vk.dbsize());
  results.valkeyKeys = users;
  await Promise.all(kids.map((k) => new Promise((res) => { k.on('exit', res); k.send({ cmd: 'close' }); })));
  await sleep(2000);
  results.leftoverUserKeysAfterClose = (await vk.keys('lobby:user:*')).length;
  console.log('RESULT', JSON.stringify(results));
  await vk.quit();
  process.exit(0);
}

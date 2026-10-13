// Shared helpers for the lobby/run session load and race tests. Talks ONLY to
// the isolated stack (backend :3100, Valkey :56379) and refuses anything else;
// see README.md.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Valkey = require('iovalkey');

export const WS_URL = 'ws://127.0.0.1:3100/game';
export const VALKEY_PORT = 56379;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || process.env.VALKEY_PORT !== '56379' || process.env.NEST_PORT !== '3100')
  throw new Error('Refusing: env is not the isolated load-test env');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const steamID = (id) => String(76561190000000000n + BigInt(id));
export const token = (id) =>
  jwt.sign({ id, steamID: steamID(id), gameAuth: true }, JWT_SECRET, { expiresIn: '2h' });

export function valkey() {
  return new Valkey(VALKEY_PORT, '127.0.0.1');
}

/** One game client connection. Responses for an event arrive in send order (concatMap). */
export class Client {
  constructor(userID) {
    this.userID = userID;
    this.waiters = new Map(); // event -> [{resolve, t0}]
    this.pushes = []; // unsolicited messages
    this.closeCode = null;
  }

  connect(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      const ws = new WebSocket(WS_URL, { headers: { Authorization: 'Bearer ' + token(this.userID) } });
      this.ws = ws;
      const timer = setTimeout(() => { ws.terminate(); reject(new Error('connect timeout')); }, timeoutMs);
      ws.on('open', () => { clearTimeout(timer); resolve(performance.now() - t0); });
      ws.on('error', (e) => { clearTimeout(timer); reject(e); });
      ws.on('close', (code) => {
        this.closeCode = code;
        for (const q of this.waiters.values()) for (const w of q) w.reject(new Error('closed ' + code));
        this.waiters.clear();
      });
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        const q = this.waiters.get(msg.event);
        if (q?.length) {
          const w = q.shift();
          w.resolve({ data: msg.data, ms: performance.now() - w.t0 });
        } else this.pushes.push(msg);
      });
    });
  }

  /** Send and await the response to this event. */
  request(event, data, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState !== WebSocket.OPEN) return reject(new Error('not open'));
      const entry = { t0: performance.now(), resolve, reject };
      const timer = setTimeout(() => reject(new Error('timeout ' + event)), timeoutMs);
      entry.resolve = (v) => { clearTimeout(timer); resolve(v); };
      entry.reject = (e) => { clearTimeout(timer); reject(e); };
      if (!this.waiters.has(event)) this.waiters.set(event, []);
      this.waiters.get(event).push(entry);
      this.ws.send(JSON.stringify({ event, data }));
    });
  }

  /** Fire and forget. Still queues a waiter so later request()s match their own responses. */
  send(event, data) {
    const noop = () => {};
    if (!this.waiters.has(event)) this.waiters.set(event, []);
    this.waiters.get(event).push({ t0: 0, resolve: noop, reject: noop });
    this.ws.send(JSON.stringify({ event, data }));
  }

  close() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED) return resolve();
      this.ws.once('close', () => resolve());
      this.ws.close();
    });
  }

  terminate() {
    this.ws.terminate();
  }

  get open() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function status({ lobbyID, isMapLobby, mapID, gamemode }) {
  return isMapLobby || mapID
    ? { lobbyID: String(lobbyID), isMapLobby: !!isMapLobby, mapID, gamemode }
    : { lobbyID: String(lobbyID), isMapLobby: false };
}

export function pct(arr, p) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1);
}

export function summarize(arr) {
  return { n: arr.length, p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99), max: arr.length ? +arr.reduce((a, b) => (b > a ? b : a)).toFixed(1) : null };
}

/** Run fn over items with at most `limit` in flight. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Read every lobby status from Valkey and check the indexes agree with the user
 * hashes. Returns { users: Map<userID, hash>, violations: string[] }.
 */
export async function checkInvariants(vk) {
  const now = Date.now();
  const violations = [];
  const users = new Map();

  const userKeys = await scanAll(vk, 'lobby:user:*');
  const pipe = vk.pipeline();
  for (const k of userKeys) pipe.hgetall(k);
  const hashes = userKeys.length ? await pipe.exec() : [];
  userKeys.forEach((k, i) => users.set(Number(k.split(':')[2]), hashes[i][1]));

  // Every user hash must appear (unexpired) in its lobby set and, for map lobbies, its map set.
  const chk = vk.pipeline();
  const checks = [];
  for (const [uid, h] of users) {
    if (!h.lobbyID) { violations.push(`user ${uid} hash without lobbyID`); continue; }
    chk.zscore(`lobby:members:${h.lobbyID}`, uid); checks.push([uid, 'members', h]);
    if (h.isMapLobby === '1') {
      chk.zscore(`lobby:map:${h.gamemode}:${h.mapID}`, uid); checks.push([uid, 'map', h]);
      chk.zscore(`lobby:maps:${h.gamemode}`, h.mapID); checks.push([uid, 'maps', h]);
    }
  }
  const res = checks.length ? await chk.exec() : [];
  res.forEach(([, score], i) => {
    const [uid, kind, h] = checks[i];
    if (score === null) violations.push(`user ${uid} missing from ${kind} index (lobby ${h.lobbyID})`);
    else if (Number(score) <= now) violations.push(`user ${uid} expired in ${kind} index`);
  });

  // Every unexpired index member must have a hash pointing at that index.
  for (const key of await scanAll(vk, 'lobby:members:*')) {
    const lobbyID = key.slice('lobby:members:'.length);
    for (const m of await vk.zrangebyscore(key, `(${now}`, '+inf')) {
      const h = users.get(Number(m));
      if (!h || h.lobbyID !== lobbyID) violations.push(`stale member ${m} in ${key} (user is in ${h?.lobbyID ?? 'nothing'})`);
    }
  }
  for (const key of await scanAll(vk, 'lobby:map:*')) {
    const [, , gm, mapID] = key.split(':');
    for (const m of await vk.zrangebyscore(key, `(${now}`, '+inf')) {
      if (Number(m) < 0) continue; // fake players script
      const h = users.get(Number(m));
      if (!h || h.isMapLobby !== '1' || h.gamemode !== gm || h.mapID !== mapID)
        violations.push(`stale member ${m} in ${key}`);
    }
  }
  return { users, violations };
}

export async function scanAll(vk, match) {
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await vk.scan(cursor, 'MATCH', match, 'COUNT', 1000);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

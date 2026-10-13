# Results

Measured 2026-10-12 on the game WebSocket's lobby tracking and run sessions.
How to reproduce is in [README.md](README.md), raw output in [results/](results).

**Setup:** AMD Ryzen 7 5800X (8 cores / 16 threads), 64 GB RAM, Windows 11.
Backend on Node 22.14 with 4 cluster workers (round-robin) unless noted, Valkey
8.1.3 and Postgres 18 in Docker. The load generator ran on the same machine.
Simulated players: 70% in map lobbies, over 300 maps (skewed towards popular
ones) and 3 gamemodes.

## Summary

- Valkey is nowhere near a limit. At 10k players with 1,000 lobby changes/s
  and 2,000 count requests/s it used 5.7% CPU; the Node workers are the
  bottleneck.
- The map player counts cache works: Valkey's cost for counts stays at about
  2.4 range queries/s however many clients ask.
- Found and fixed:
  - Reconnecting to a different worker left both connections open. If the old
    one reported again before closing, the player vanished from lobby tracking
    while connected.
  - Statuses Valkey lost (restart, flush) were never restored.
  - Uploading the same run twice at once counted it twice, including XP, when
    it improved a PB.
- Still open: abandoned run sessions never expire (fix parked, see below).

## Lobby load

| | 5k players | 10k players | 10k players, 1 worker |
|---|---|---|---|
| Lobby changes / count requests per s | 500 / 1,000 | 1,000 / 2,000 | 1,000 / 2,000 |
| Lobby change latency p50 / p95 / p99 | 2.1 / 4.0 / 5.5 ms | 5.0 / 7.4 / 9.5 ms | 10.1 / 16.3 / 22.7 ms\* |
| Count request latency p50 / p95 / p99 | 1.2 / 2.7 / 3.8 ms | 2.7 / 5.1 / 7.0 ms | 5.5 / 12.0 / 16.1 ms\* |
| Valkey CPU, under load | 3.5% | 5.7% | 7.1% |
| Valkey CPU, idle (refresh only) | 0.3% | 0.4% | |
| Valkey commands/s, under load | 8.2k | 15.9k | 14.2k |
| Backend CPU, all workers (100% = 1 core) | 36% | 90% | 64% |
| Valkey memory | 2.5 MB | 3.8 MB | |
| Errors / unexpected disconnects | 0 / 0 | 0 / 0 | 0 / 0 |

\* 3,394 clients connected in this run (see connection bursts below), sending
the full message rates.

- **Refresh** costs exactly one status write per player per minute: 83.3/s at
  5k players, 166.7/s at 10k.
- **Status write script:** about 31µs per call, so a single Valkey thread tops
  out around 30k writes/s. 10k players reporting at once peaked at 17k/s (76%
  Valkey CPU) and finished in 0.6s, p99 437 ms.
- **Connection bursts:** a single worker refused 6,606 of 10,000 connections
  when 400 handshakes arrived at once, but accepted all 10,000 at 100 at a time.
  4 workers accepted 10,000 at 400 at a time. Clients retry with backoff, so a
  reconnect storm after a deploy recovers, just more slowly on one worker.

## Lobby concurrency (4 workers)

| Test | Before fixes | After fixes |
|---|---|---|
| Reconnect: new connection reports, then old one closes (200) | ✅ all correct, still correct after a refresh cycle | ✅ same |
| Updates sent, then close/terminate immediately (400) | ✅ nothing left, refresh never revives one | ✅ same |
| 400 players, 12,000 concurrent updates/leaves during refresh | ✅ Valkey matches every last report, 0 index violations | ✅ same |
| Map counts from connections on every worker (110) | ✅ all identical and correct | ✅ same |
| Old connection reports after the new one, then closes | ❌ player vanished in 154/154 cross-worker cases | ✅ old connection closed within 250 ms (200/200), status kept (200/200) |
| Two connections for a user opening at once (200) | ❌ both stay open when on different workers | ✅ exactly one survives (200/200) |
| Valkey loses its data (`FLUSHALL`) | ❌ 0/200 restored | ✅ 200/200 restored within one refresh cycle |

Fixes: `fix(back): Close a user's older WS connections on every worker`,
`fix(back): Restore lobby statuses Valkey has lost`.

## Run sessions

| Test | Result |
|---|---|
| 300 clients × 50 updates, sent without waiting for replies | ✅ every session in exact order |
| 3,000 runners, 5,715 updates/s for 30s | ✅ p50 7.8 / p95 34.2 / p99 52.7 ms, nothing out of order |
| Reconnecting to another worker mid-run (200) | ✅ all sessions intact and in order |
| 5 concurrent creates on one connection, same track (200) | ✅ exactly one session each, no leftovers |
| `runsession.end` arriving during the replay upload (20) | ✅ all clean, no leftover keys |
| Same replay uploaded twice at once, improving a PB (10) | ❌ → ✅ see below |
| Same replay uploaded twice at once, first completion (10) | ❌ → ✅ see below |
| Disconnecting mid-run (300 sessions) | ❌ all 600 session keys left, none with an expiry |
| Two connections creating on the same track at once (200) | ⚠️ 2 sessions in 67–71 cases |

**Duplicate uploads**, e.g. a client retrying an upload that timed out. Both
requests read the session before either deleted it:

| | Before | After |
|---|---|---|
| Improving a PB | 200 + 200: run counted twice, 2× cosmetic XP, 2 `PastRun`s, 2 PB activities (10/10) | 200 + 400, counted once |
| First completion | 200 + 500 (leaderboard run unique constraint), plus an orphaned `PastRun` (10/10) | 200 + 400, counted once |

Fix: `fix(back): Stop run sessions being counted twice` claims the session
with a script that reads and deletes it in one step, and creates the
`PastRun` inside the leaderboard transaction.

**Abandoned sessions:** active sessions have no expiry, so crashing or quitting
mid-run leaves them in Valkey for good. It's bounded per user (their next
session on the same track replaces it), but not across users who never come
back. A fix expiring them after 24 hours without an update is parked on
`backup/run-session-active-expiry`, until the game can tell players when a run
expired. The two-connection duplicate above ends up as the same kind of leak.

## Test suites

With all fixes, including the parked expiry change: backend e2e 1,059/1,064
(the 5 failures are map upload tests that 403 locally because the throwaway
bucket isn't public-read), backend unit 172/172. With the expiry change taken
back out, the affected specs (session, session-ws, runs, lobby-ws,
chat-bans-ws) pass 90/90.

## Notes on the raw logs

The churn results in `results/lobby-races-*.log` were recorded before a harness
bug was fixed: fire-and-forget sends didn't queue a placeholder for their
replies, so a later round trip could match an earlier reply and check too soon.
Churn was re-run with the fixed harness with the same result (0/400
mismatched, 0 violations).

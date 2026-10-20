/**
 * Lua scripts for rank points. Run server-side so each is atomic with respect
 * to every other Valkey command, which the commit step relies on: nothing can
 * stage new points for a track between the ZUNIONSTORE reading the staging set
 * and the RENAME promoting it.
 */

/**
 * Commit staged track points to a ladder.
 *
 * KEYS[1]            ladder key
 * KEYS[2i], KEYS[2i+1] (track key, staging key) pairs for each leaderboard
 *
 * For every pair: the ladder loses the track's currently committed points and
 * gains the staged points (missing keys count as empty, so a missing staging
 * set simply removes the track from the ladder). Then each staging set is
 * renamed over its track set, or the track set is deleted if nothing was
 * staged. Finally anyone left on the ladder with no points is dropped.
 *
 * Doing all tracks in one ZUNIONSTORE is 5-10x faster than one per track.
 *
 * Returns the number of leaderboards committed.
 */
export const COMMIT_RANK_POINTS_LUA = `
local ladder = KEYS[1]
local count = (#KEYS - 1) / 2
if count == 0 then
  return 0
end

local cmd = { 'ZUNIONSTORE', ladder, 1 + 2 * count, ladder }
local weights = { 'WEIGHTS', 1 }
for i = 1, count do
  cmd[#cmd + 1] = KEYS[2 * i]       -- track (old points)
  cmd[#cmd + 1] = KEYS[2 * i + 1]   -- staging (new points)
  weights[#weights + 1] = -1
  weights[#weights + 1] = 1
end
for i = 1, #weights do
  cmd[#cmd + 1] = weights[i]
end
redis.call(unpack(cmd))

for i = 1, count do
  local track = KEYS[2 * i]
  local staging = KEYS[2 * i + 1]
  if redis.call('EXISTS', staging) == 1 then
    redis.call('RENAME', staging, track)
  else
    redis.call('DEL', track)
  end
end

-- Points are integers so totals are exact; anyone at exactly 0 has no runs
-- left on any ranked track.
redis.call('ZREMRANGEBYSCORE', ladder, '-inf', 0)

return count
`;

/**
 * Release a lock only if we still hold it.
 *
 * KEYS[1] lock key
 * ARGV[1] our lock token
 */
export const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

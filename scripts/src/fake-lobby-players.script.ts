import Valkey from 'iovalkey';
import { Gamemode } from '@momentum/constants';
import * as Enum from '@momentum/enum';

// Adds fake players to map lobbies in Valkey, for testing the game's map
// selector player counts without real players.
//
// The keys mirror LobbyService's storage. Fake players have negative user IDs
// so they can't clash with real ones, and never expire. A real player joining
// or leaving a map lobby in the same gamemode does set a 3 minute expiry on the
// keys though, after which the fake players need setting again.

const USAGE = `Usage: nx run scripts:fake-lobby-players -- <command>

Commands:
  set <gamemode> <mapID> <count>  Replace a map's fake players with <count> of them (0 removes them)
  clear                           Remove all fake players
  list                            List maps with fake players

<gamemode> is a number from the Gamemode enum, e.g. 2 for Bhop.
`;

/** Sorted set of user IDs in a map's lobbies, suffixed `<gamemode>:<mapID>`. */
const MAP_MEMBERS_PREFIX = 'lobby:map:';
/** Sorted set of map IDs with anyone in their lobbies, suffixed `<gamemode>`. */
const ACTIVE_MAPS_PREFIX = 'lobby:maps:';

const mapMembersKey = (gamemode: number, mapID: number | string) =>
  `${MAP_MEMBERS_PREFIX}${gamemode}:${mapID}`;
const activeMapsKey = (gamemode: number) => `${ACTIVE_MAPS_PREFIX}${gamemode}`;

async function setFakePlayers(
  valkey: Valkey,
  gamemode: number,
  mapID: number,
  count: number
) {
  await removeFakePlayers(valkey, gamemode, mapID);
  if (count === 0) {
    console.log(
      `Removed fake players from map ${mapID} (gamemode ${gamemode})`
    );
    return;
  }

  const membersKey = mapMembersKey(gamemode, mapID);
  const scoresAndMembers = Array.from({ length: count }, (_, i) => [
    '+inf',
    -(i + 1)
  ]).flat();

  await valkey
    .multi()
    .zadd(membersKey, ...scoresAndMembers)
    .persist(membersKey)
    .zadd(activeMapsKey(gamemode), '+inf', mapID)
    .persist(activeMapsKey(gamemode))
    .exec();

  console.log(
    `Map ${mapID} (gamemode ${gamemode}) now has ${count} fake players`
  );
}

async function removeFakePlayers(
  valkey: Valkey,
  gamemode: number,
  mapID: number | string
) {
  const membersKey = mapMembersKey(gamemode, mapID);

  const fakeIDs = (await valkey.zrange(membersKey, '0', '-1')).filter(
    (id) => Number(id) < 0
  );
  if (fakeIDs.length > 0) {
    await valkey.zrem(membersKey, ...fakeIDs);
  }

  // The map's entry has the latest expiry of its members, which was the fake
  // players' never-expiring one, so recalculate it from any real players left.
  const [, latestExpiry] = await valkey.zrange(
    membersKey,
    '-1',
    '-1',
    'WITHSCORES'
  );
  if (latestExpiry) {
    await valkey.zadd(activeMapsKey(gamemode), latestExpiry, mapID);
  } else {
    await valkey.zrem(activeMapsKey(gamemode), mapID);
  }
}

/** Maps with fake players, and how many. */
async function findFakePlayers(valkey: Valkey) {
  const found: { gamemode: number; mapID: string; count: number }[] = [];

  for (const gamemode of Enum.fastValuesNumeric(Gamemode)) {
    const mapIDs = await valkey.zrange(activeMapsKey(gamemode), '0', '-1');
    for (const mapID of mapIDs) {
      const members = await valkey.zrange(
        mapMembersKey(gamemode, mapID),
        '0',
        '-1'
      );
      const count = members.filter((id) => Number(id) < 0).length;
      if (count > 0) found.push({ gamemode, mapID, count });
    }
  }

  return found;
}

function parseNonNegativeInt(value: string | undefined, name: string): number {
  const number = Number(value);
  if (value === undefined || !Number.isInteger(number) || number < 0) {
    throw `Invalid ${name}: ${value}`;
  }
  return number;
}

async function main(valkey: Valkey, [command, ...args]: string[]) {
  switch (command) {
    case 'set': {
      const gamemode = parseNonNegativeInt(args[0], 'gamemode');
      if (!Enum.fastValuesNumeric(Gamemode).includes(gamemode)) {
        throw `Unknown gamemode: ${gamemode}`;
      }
      const mapID = parseNonNegativeInt(args[1], 'map ID');
      const count = parseNonNegativeInt(args[2], 'count');
      await setFakePlayers(valkey, gamemode, mapID, count);
      break;
    }
    case 'clear': {
      const found = await findFakePlayers(valkey);
      for (const { gamemode, mapID } of found) {
        await removeFakePlayers(valkey, gamemode, mapID);
      }
      console.log(`Removed fake players from ${found.length} maps`);
      break;
    }
    case 'list': {
      const found = await findFakePlayers(valkey);
      if (found.length === 0) console.log('No fake players');
      for (const { gamemode, mapID, count } of found) {
        console.log(
          `Map ${mapID}, gamemode ${gamemode} (${Gamemode[gamemode]}): ${count}`
        );
      }
      break;
    }
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

const env = process.env.NODE_ENV;
if (!(env === 'dev' || env === 'test')) {
  console.error(
    'Refusing to run Valkey-altering script unless NODE_ENV is set to "dev" or "test".'
  );
  process.exit(1);
}

// Connects the same way as the backend's ValkeyService
const port = process.env['VALKEY_PORT']
  ? Number(process.env['VALKEY_PORT'])
  : 6379;
const host = process.env['VALKEY_HOST'] || 'localhost';
const valkey = port === 0 ? new Valkey({ path: host }) : new Valkey(port, host);

main(valkey, process.argv.slice(2))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => valkey.quit());

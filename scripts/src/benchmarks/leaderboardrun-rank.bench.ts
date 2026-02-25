// noinspection JSUnusedLocalSymbols

import { PrismaClient } from '@momentum/db';
import { prismaWrapper } from '../prisma-wrapper.util';
import { nuke } from '../reset.util';

/*
 Script for benchmarking selecting leaderboard runs, comparing various
 window-function as well as an approach with a materialized "rank" column
 updated with a trigger on insert.

 Some benches on my machine (i9 9900K, NVMe SSD)
 1k runs:
  Ran 500 queries for windowFunctionSimpleQuery1, total time: 783ms, average time: 1.57ms, min: 1ms, max: 6ms
  Ran 500 queries for windowFunctionSpecificUserQuery1, total time: 870ms, average time: 1.74ms, min: 1ms, max: 3ms
  Ran 500 queries for windowFunctionSpecificUserQuery3, total time: 928ms, average time: 1.86ms, min: 1ms, max: 3ms
  Ran 500 queries for windowFunctionFindOffsetQuery, total time: 455ms, average time: 0.91ms, min: 0ms, max: 3ms  Insert with trigger at start: 22.77ms
  Insert with trigger near end: 21.866ms

 100k runs:
  Ran 500 queries for windowFunctionSimpleQuery1, total time: 1771ms, average time: 3.54ms, min: 3ms, max: 15ms
  Ran 500 queries for windowFunctionSpecificUserQuery1, total time: 13459ms, average time: 26.92ms, min: 24ms, max: 52ms
  Ran 500 queries for windowFunctionSpecificUserQuery3, total time: 12651ms, average time: 25.30ms, min: 24ms, max: 35ms
  Ran 500 queries for windowFunctionFindOffsetQuery, total time: 1678ms, average time: 3.36ms, min: 3ms, max: 5ms
  Insert with trigger at start: 2.139s
  Insert with trigger near end: 2.263s

 1m runs:
  Ran 500 queries for windowFunctionSimpleQuery1, total time: 13223ms, average time: 26.45ms, min: 24ms, max: 347ms
  Ran 500 queries for windowFunctionSpecificUserQuery1, total time: 116818ms, average time: 233.64ms, min: 224ms, max: 927ms
  Ran 500 queries for windowFunctionSpecificUserQuery3, total time: 154864ms, average time: 309.73ms, min: 300ms, max: 678ms
  Ran 500 queries for windowFunctionFindOffsetQuery, total time: 28525ms, average time: 57.05ms, min: 55ms, max: 86ms
  Insert with trigger at start: 1:09.513 (m:ss.mmm)
  Insert with trigger near end: 1:28.102 (m:ss.mmm)

 So:
 - Simple queries (just fetch with limit and offset): Window function approach
   is very solid, most time is spend in index scan, still costly for huge
   leaderboards but pretty much the best we're gonna get.

 - Filtering by specifics users: significantly slower, bit annoying but don't
   think we can do much better.
   - First version is considerably faster, does a fairly index (not index-only)
     scan of entire index then WindowAgg over everything to get rank, *then*
     filters the specific users. Obviously we can't filter the users before the
      WindowAgg, so this seems as good as it's likely to get.
   - Second version was an attempt to use a similar approach to FindOffsetQuery,
     effectively running 10 times the FindOffsetQuery approach in parallel, just
     ends up about 2x slower than the first.
   - Third version is a gross new idea I had that I don't *think* is any better
     than the first: we don't include userID in the first CTE, meaning we get to
     use an index-only scan rather than just an index scan. Then same thing as
     first version; WindowAgg then filter by IDs. Finally we use the createdAt
     and time from the first CTE to do an index-only scan to get the rest of the
     info. Almost same perf as the first, perhaps slightly worse, and more
     complicated - going with the first.

  - Finding rank of specific user: solid again, index only scan of the index
    with createdAt and time, then index scan of index (pk) containing userID.

  - Materialized rank with trigger: obviously very fast to query, but inserts
    and absurdly slow, not gonna happen. Also limits usefulness of potential
    read-replicas in future.

  - Insertation costs and updating indexes - can't see any major performance
    decreases here, takes like 5ms to insert anywhere on a 1m run leaderboard.
*/

const NUM_RUNS = 1_000;
const NUM_QUERIES = 500;
let mapID = 0;
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};

prismaWrapper(async (prisma: PrismaClient) => {
  async function bench(fn: (...args: any[]) => string, ...args: any[]) {
    const times = [];
    for (let i = 0; i < NUM_QUERIES; i++) {
      const start = Date.now();
      const query = fn(...args);
      // if (i == 0) console.log(`\n${query}\n`);
      const explain = false;
      const res: any[] = await prisma.$queryRawUnsafe(
        explain ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)' + query : query
      );
      if (explain && i === 0) {
        console.log(`\n${fn.name} EXPLAIN output:`);
        res.forEach((row) => console.log(row['QUERY PLAN']));
      } else if (res.length === 0) {
        console.warn('Query returned 0 results, query may be wrong!');
      }
      const end = Date.now();
      times.push(end - start);
    }
    const total = times.reduce((a, b) => a + b, 0);
    console.log(
      `Ran ${NUM_QUERIES} queries for ${fn.name}, total time: ${total}ms, average time: ${(total / NUM_QUERIES).toFixed(2)}ms, min: ${Math.min(...times)}ms, max: ${Math.max(...times)}ms`
    );
  }

  const args = new Set(process.argv.slice(1));

  let userIDs = [];
  let steamIDs = [];

  // Clean up other old stuff from previous runs, even if not initing
  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS leaderboard_rank_insert ON "LeaderboardRun";'
  );
  await prisma.$executeRawUnsafe(
    'DROP FUNCTION IF EXISTS assign_leaderboard_rank();'
  );
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS "LeaderboardRun_rank_idx";'
  );

  await prisma.$executeRawUnsafe(`
      ALTER TABLE "LeaderboardRun"
      DROP COLUMN IF EXISTS "rank";
  `);

  if (args.has('--init')) {
    console.log('Resetting DB...');

    await nuke(prisma);

    console.log(`Preparing DB with ${NUM_RUNS} runs...`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" ("alias", "steamID")
      SELECT 'User' || i, i
      FROM generate_series(0, ${NUM_RUNS - 1}) AS i;
    `);
    const users = await prisma.user.findMany({
      select: { id: true, steamID: true }
    });
    userIDs = users.map(({ id }) => id);
    users.map(({ steamID }) => steamID);

    const map = await prisma.mMap.create({
      data: {
        name: 'hello',
        status: 0,
        leaderboards: {
          create: {
            gamemode: 0,
            trackNum: 0,
            trackType: 0,
            style: 0,
            type: 0
          }
        }
      }
    });
    mapID = map.id;

    // Doing this with SQL to avoid round-trips for huge leaderboards
    await prisma.$executeRawUnsafe(`
      INSERT INTO "LeaderboardRun" ("userID", "mapID", "gamemode", "trackType", "trackNum", "style", "time", "splits")
      SELECT "id", ${map.id}, 0, 0, 0, 0, "id", '{}'::json
      FROM "User";
    `);
  } else {
    userIDs = (await prisma.user.findMany({ select: { id: true } })).map(
      ({ id }) => id
    );
    mapID = (await prisma.mMap.findFirstOrThrow({ select: { id: true } })).id;
  }

  // AHHHHH I'm an idiot. Don't forget this in the future. Query performance is
  // dogshit without it after adding so much data. Guuuuuuh
  await prisma.$executeRawUnsafe('VACUUM ANALYZE "LeaderboardRun";');

  await bench(
    windowFunctionSimpleQuery1,
    Math.floor(Math.random() * NUM_RUNS),
    10
  );

  // So slow I don't even care
  // await bench(
  //   windowFunctionSimpleQuery2,
  //   Math.floor(Math.random() * NUM_RUNS),
  //   10
  // );

  await bench(
    windowFunctionSpecificUserQuery1,
    Math.floor(Math.random() * 10),
    10,
    Array.from(
      { length: 20 },
      () => userIDs[Math.floor(Math.random() * userIDs.length)]
    )
  );

  // await bench(
  //   windowFunctionSpecificUserQuery2,
  //   Math.floor(Math.random() * 10),
  //   10,
  //   Array.from(
  //     { length: 20 },
  //     () => userIDs[Math.floor(Math.random() * userIDs.length)]
  //   )
  // );

  await bench(
    windowFunctionSpecificUserQuery3,
    Math.floor(Math.random() * 10),
    10,
    Array.from(
      { length: 20 },
      () => userIDs[Math.floor(Math.random() * userIDs.length)]
    )
  );

  await bench(
    windowFunctionFindOffsetQuery,
    userIDs[Math.floor(Math.random() * userIDs.length)]
  );

  await materializedRankStuff(prisma);

  await analyzeInsertCost(prisma);
});

/*
  EXPLAIN output (100k runs):
  WindowAgg  (cost=4904.80..4988.85 rows=10 width=281) (actual time=11.121..11.162 rows=10.00 loops=1)
    Window: w1 AS (ROWS UNBOUNDED PRECEDING)
    Storage: Memory  Maximum Storage: 17kB
    Buffers: shared hit=610
    ->  Nested Loop  (cost=4904.80..4988.67 rows=10 width=342) (actual time=11.100..11.124 rows=10.00 loops=1)
          Buffers: shared hit=610
          ->  Limit  (cost=4904.51..4905.60 rows=10 width=241) (actual time=11.088..11.092 rows=10.00 loops=1)
                Buffers: shared hit=580
                InitPlan 1
                  ->  Limit  (cost=4904.04..4904.09 rows=1 width=16) (actual time=11.067..11.067 rows=1.00 loops=1)
                        Buffers: shared hit=576
                        ->  Index Only Scan using "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" on "LeaderboardRun" "LeaderboardRun_1"  (cost=0.42..5186.42 rows=100000 width=16) (actual time=0.037..8.950 rows=94556.00 loops=1)
                              Index Cond: (("mapID" = 1249) AND (gamemode = 0) AND ("trackType" = 0) AND ("trackNum" = 0) AND (style = 0))
                              Heap Fetches: 0
                              Index Searches: 1
                              Buffers: shared hit=576
                ->  Index Scan using "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" on "LeaderboardRun"  (cost=0.42..3625.84 rows=33333 width=241) (actual time=11.086..11.089 rows=10.00 loops=1)
                      Index Cond: (("mapID" = 1249) AND (gamemode = 0) AND ("trackType" = 0) AND ("trackNum" = 0) AND (style = 0) AND (ROW("time", "createdAt") >= ROW((InitPlan 1).col1, (InitPlan 1).col2)))
                      Index Searches: 1
                      Buffers: shared hit=580
          ->  Index Scan using "User_pkey" on "User" u  (cost=0.29..8.31 rows=1 width=105) (actual time=0.003..0.003 rows=1.00 loops=10)
                Index Cond: (id = "LeaderboardRun"."userID")
                Index Searches: 10
                Buffers: shared hit=30
  Planning:
    Buffers: shared hit=134
  Planning Time: 3.317 ms
  Execution Time: 11.225 ms
 */
function windowFunctionSimpleQuery1(offset: number, limit: number): string {
  return `
    SELECT
      "s".*,
      row_to_json("u") AS "user",
      ROW_NUMBER() OVER () + ${offset} AS rn
    FROM (
      SELECT
        *
      FROM
        "LeaderboardRun"
      WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") = (${mapID}, 0, 0, 0, 0)
      AND ("time", "createdAt") >=
      (SELECT
          "time",
          "createdAt"
        FROM
          "LeaderboardRun"
        WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") = (${mapID}, 0, 0, 0, 0)
      ORDER BY
        "time",
        "createdAt" OFFSET ${offset}
      LIMIT 1)
    ORDER BY
      "time",
      "createdAt"
    LIMIT ${limit}) s
      INNER JOIN "User" AS "u" ON "userID" = "u"."id";`;
}

// This query simpler but drastically slower since it has to sort the entire
// result set before applying the offset and limit.
// First query on the other hand uses the
// (mapID, gamemode, trackType, trackNum, style, time, createdAt) index to jump
// directly to the offset without sorting the entire result set.
function windowFunctionSimpleQuery2(offset: number, limit: number): string {
  return `
    SELECT
      s.*,
      row_to_json("u") AS "user",
      ROW_NUMBER() OVER (ORDER BY s."time", s."createdAt") AS rn
    FROM
      "LeaderboardRun" s
      INNER JOIN "User" AS "u" ON s."userID" = "u"."id"
    WHERE (s."mapID", s."gamemode", s."trackType", s."trackNum", s."style") = (${mapID}, 0, 0, 0, 0)
    ORDER BY
      s."time",
      s."createdAt" OFFSET ${offset}
    LIMIT ${limit};`;
}

/*
  EXPLAIN output (100k runs):
  Limit  (cost=10683.41..12463.84 rows=1 width=256) (actual time=33.492..48.040 rows=3.00 loops=1)
    Buffers: shared hit=1570
    ->  Nested Loop  (cost=0.82..10683.41 rows=6 width=256) (actual time=7.677..48.037 rows=10.00 loops=1)
          Buffers: shared hit=1570
          ->  Subquery Scan on ranked  (cost=0.53..10600.32 rows=10 width=224) (actual time=7.651..47.885 rows=10.00 loops=1)
                Filter: (ranked."userID" = ANY ('{20012339,19968269,20007070,19960349,19974170,19956749,19989445,20030233,19953162,20001017}'::integer[]))
                Rows Removed by Filter: 99990
                Buffers: shared hit=1540
                ->  WindowAgg  (cost=0.51..9100.29 rows=100000 width=224) (actual time=0.020..41.637 rows=100000.00 loops=1)
                      Window: w1 AS (ORDER BY "LeaderboardRun"."time", "LeaderboardRun"."createdAt" ROWS UNBOUNDED PRECEDING)
                      Storage: Memory  Maximum Storage: 17kB
                      Buffers: shared hit=1540
                      ->  Index Scan using "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" on "LeaderboardRun"  (cost=0.42..7350.29 rows=100000 width=216) (actual time=0.017..18.566 rows=100000.00 loops=1)
                            Index Cond: (("mapID" = 1249) AND (gamemode = 0) AND ("trackType" = 0) AND ("trackNum" = 0) AND (style = 0))
                            Index Searches: 1
                            Buffers: shared hit=1540
          ->  Index Scan using "User_pkey" on "User" u  (cost=0.29..8.31 rows=1 width=105) (actual time=0.007..0.007 rows=1.00 loops=10)
                Index Cond: (id = ranked."userID")
                Index Searches: 10
                Buffers: shared hit=30
  Planning:
    Buffers: shared hit=9
  Planning Time: 0.173 ms
  Execution Time: 48.065 ms
 */
function windowFunctionSpecificUserQuery1(
  offset: number,
  limit: number,
  users: number[]
): string {
  return `
  WITH ranked AS (
    SELECT
      "time", "userID", "createdAt", "replayHash", "flags",
      ROW_NUMBER() OVER (ORDER BY "time", "createdAt") AS rn
    FROM
      "LeaderboardRun"
    WHERE ("mapID",
           "gamemode",
           "trackType",
           "trackNum",
           "style") = (${mapID},
            0,
            0,
            0,
            0))
          SELECT
            "ranked".*,
            row_to_json("u") AS "user"
          FROM
            ranked
              INNER JOIN "User" AS "u" ON "ranked"."userID" = "u"."id"
          WHERE
            "ranked"."userID" = ANY ('{${users.join(',')}}'::int[])
          ORDER BY
            "ranked"."time",
            "ranked"."createdAt" OFFSET ${offset}
            LIMIT ${limit};`;
}

/*
  EXPLAIN output (100k runs):
  Limit  (cost=146.27..19103.94 rows=10 width=60) (actual time=1.673..66.289 rows=10.00 loops=1)
    Buffers: shared hit=2945
    ->  Result  (cost=146.27..19103.94 rows=10 width=60) (actual time=1.672..66.282 rows=10.00 loops=1)
          Buffers: shared hit=2945
          ->  Sort  (cost=146.27..146.29 rows=10 width=52) (actual time=0.097..0.104 rows=10.00 loops=1)
                Sort Key: r."time", r."createdAt"
                Sort Method: quicksort  Memory: 27kB
                Buffers: shared hit=60
                ->  Nested Loop  (cost=0.58..146.10 rows=10 width=52) (actual time=0.022..0.092 rows=10.00 loops=1)
                      Buffers: shared hit=60
                      ->  Index Scan using "LeaderboardRun_pkey" on "LeaderboardRun" r  (cost=0.29..62.98 rows=10 width=20) (actual time=0.011..0.040 rows=10.00 loops=1)
                            Index Cond: (("userID" = ANY ('{19984971,19949994,20035324,19984056,19950993,19963498,20016046,19957129,20004038,20002834}'::integer[])) AND (gamemode = 0) AND (style = 0) AND ("mapID" = 1249) AND ("trackType" = 0) AND ("trackNum" = 0))
                            Index Searches: 10
                            Buffers: shared hit=30
                      ->  Index Scan using "User_pkey" on "User" u  (cost=0.29..8.31 rows=1 width=105) (actual time=0.003..0.003 rows=1.00 loops=10)
                            Index Cond: (id = r."userID")
                            Index Searches: 10
                            Buffers: shared hit=30
          SubPlan 1
            ->  Aggregate  (cost=1895.74..1895.75 rows=1 width=8) (actual time=6.614..6.614 rows=1.00 loops=10)
                  Buffers: shared hit=2885
                  ->  Index Only Scan using "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" on "LeaderboardRun" r2  (cost=0.42..1812.41 rows=33333 width=0) (actual time=0.019..4.832 rows=47466.30 loops=10)
                        Index Cond: (("mapID" = 1249) AND (gamemode = 0) AND ("trackType" = 0) AND ("trackNum" = 0) AND (style = 0) AND (ROW("time", "createdAt") < ROW(r."time", r."createdAt")))
                        Heap Fetches: 0
                        Index Searches: 10
                        Buffers: shared hit=2885
  Planning:
    Buffers: shared hit=24
  Planning Time: 0.273 ms
  Execution Time: 66.328 ms
 */
function windowFunctionSpecificUserQuery2(
  offset: number,
  limit: number,
  users: number[]
): string {
  return `
  SELECT
    r."userID",
    (
      SELECT
        COUNT(*) + 1
      FROM
        "LeaderboardRun" r2
      WHERE (r2."mapID", r2."gamemode", r2."trackType", r2."trackNum", r2."style") = (${mapID}, 0, 0, 0, 0)
      AND (r2."time",
        r2."createdAt") < (r."time",
        r."createdAt")) AS rn,
  row_to_json("u") AS "user"
  FROM
    "LeaderboardRun" r
    INNER JOIN "User" AS "u" ON r."userID" = "u"."id"
  WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style") = (${mapID}, 0, 0, 0, 0)
  AND r."userID" = ANY ('{${users.join(',')}}'::int[])
    ORDER BY
    r."time",
    r."createdAt" OFFSET ${offset}
    LIMIT ${limit};
  `;
}

function windowFunctionSpecificUserQuery3(
  offset: number,
  limit: number,
  users: number[]
): string {
  return `
  WITH ranked AS (
    SELECT
      "userID",
      "time",
      "createdAt",
      ROW_NUMBER() OVER (ORDER BY "time", "createdAt") AS rn
    FROM "LeaderboardRun"
    WHERE ("mapID", "gamemode", "trackType", "trackNum", "style") = (${mapID}, 0, 0, 0, 0)
  ),
  user_rows AS (
    SELECT "time", "createdAt", rn
    FROM ranked
    WHERE "userID" = ANY ('{${users.join(', ')}}'::int[])
    ORDER BY "time", "createdAt"
    OFFSET ${offset} LIMIT ${limit}
  )
  SELECT
    r.*,
    row_to_json("u") AS "user",
    ur.rn
  FROM user_rows ur
  INNER JOIN "LeaderboardRun" r
    ON (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style", r."time", r."createdAt")
     = (${mapID}, 0, 0, 0, 0, ur."time", ur."createdAt")
  INNER JOIN "User" u ON r."userID" = u."id"
  ORDER BY r."time", r."createdAt";`;
}

/*
  EXPLAIN output (100k runs):
  Index Scan using "LeaderboardRun_pkey" on "LeaderboardRun" r  (cost=0.29..1904.07 rows=1 width=8) (actual time=6.534..6.536 rows=1.00 loops=1)
  Index Cond: (("userID" = 19989888) AND (gamemode = 0) AND (style = 0) AND ("mapID" = 1249) AND ("trackType" = 0) AND ("trackNum" = 0))
  Index Searches: 1
  Buffers: shared hit=323
  SubPlan 1
    ->  Aggregate  (cost=1895.74..1895.75 rows=1 width=8) (actual time=6.519..6.519 rows=1.00 loops=1)
          Buffers: shared hit=320
          ->  Index Only Scan using "LeaderboardRun_mapID_gamemode_trackType_trackNum_style_time_idx" on "LeaderboardRun" r2  (cost=0.42..1812.41 rows=33333 width=0) (actual time=0.020..4.682 rows=52466.00 loops=1)
                Index Cond: (("mapID" = 1249) AND (gamemode = 0) AND ("trackType" = 0) AND ("trackNum" = 0) AND (style = 0) AND (ROW("time", "createdAt") < ROW(r."time", r."createdAt")))
                Heap Fetches: 0
                Index Searches: 1
                Buffers: shared hit=320
  Planning Time: 0.115 ms
  Execution Time: 6.560 ms
 */
function windowFunctionFindOffsetQuery(userID: number): string {
  return `
  SELECT
      (
        SELECT COUNT(*) + 1
        FROM "LeaderboardRun" r2
        WHERE (r2."mapID", r2."gamemode", r2."trackType", r2."trackNum", r2."style")
            = (${mapID}, 0, 0, 0, 0)
          AND (r2."time", r2."createdAt") < (r."time", r."createdAt")
      ) AS rn
    FROM "LeaderboardRun" r
    WHERE (r."mapID", r."gamemode", r."trackType", r."trackNum", r."style")
        = (${mapID}, 0, 0, 0, 0)
      AND r."userID" = ${userID};
    `;
}

// Prints a bunch of stats about the cost of inserting a new run.
async function analyzeInsertCost(prisma: PrismaClient) {
  const newUser = await prisma.user.create({
    data: {
      alias: 'bozo',
      steamID:
        BigInt(NUM_RUNS * 100) * BigInt(Math.floor(Math.random() * 100000000))
    }
  });

  const explainResult: any[] = await prisma.$queryRawUnsafe(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    INSERT INTO "LeaderboardRun" ("userID", "mapID", "gamemode", "trackType", "trackNum", "style", "time", "splits")
    VALUES (${newUser.id}, ${mapID}, 0, 0, 0, 0, 0.1, '{}'::json);
  `);

  const sizes: any[] = await prisma.$queryRawUnsafe(`
    SELECT indexrelname::text, pg_relation_size(indexrelid) AS size_bytes
    FROM pg_stat_user_indexes
    WHERE relname = 'LeaderboardRun';
  `);

  console.log('\n--- EXPLAIN output ---');
  for (const row of explainResult) console.log(row['QUERY PLAN']);

  console.log('\n--- Index sizes (bytes) ---');
  for (const after of sizes) {
    console.log(`${after.indexrelname}: ${after.size_bytes}`);
  }
}

async function materializedRankStuff(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LeaderboardRun" ADD COLUMN "rank" INTEGER;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX "LeaderboardRun_rank_idx" ON "LeaderboardRun" ("mapID", "gamemode", "trackType", "trackNum", "style", "rank");
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "LeaderboardRun" r
    SET "rank" = sub.rn
    FROM (
      SELECT "userID", "mapID", "gamemode", "trackType", "trackNum", "style",
        ROW_NUMBER() OVER (
          PARTITION BY "mapID", "gamemode", "trackType", "trackNum", "style"
          ORDER BY "time", "createdAt"
        ) AS rn
      FROM "LeaderboardRun"
    ) sub
    WHERE r."userID" = sub."userID"
      AND r."mapID" = sub."mapID"
      AND r."gamemode" = sub."gamemode"
      AND r."trackType" = sub."trackType"
      AND r."trackNum" = sub."trackNum"
      AND r."style" = sub."style";
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION assign_leaderboard_rank()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE "LeaderboardRun"
      SET "rank" = "rank" + 1
      WHERE "mapID" = NEW."mapID"
        AND "gamemode" = NEW."gamemode"
        AND "trackType" = NEW."trackType"
        AND "trackNum" = NEW."trackNum"
        AND "style" = NEW."style"
        AND ("time", "createdAt") >= (NEW."time", NEW."createdAt");

      NEW."rank" := (
        SELECT COUNT(*) + 1
        FROM "LeaderboardRun"
        WHERE "mapID" = NEW."mapID"
          AND "gamemode" = NEW."gamemode"
          AND "trackType" = NEW."trackType"
          AND "trackNum" = NEW."trackNum"
          AND "style" = NEW."style"
          AND ("time", "createdAt") < (NEW."time", NEW."createdAt")
      );

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER leaderboard_rank_insert
    BEFORE INSERT ON "LeaderboardRun"
    FOR EACH ROW EXECUTE FUNCTION assign_leaderboard_rank();
  `);

  const newUser1 = await prisma.user.create({
    data: {
      alias: 'TriggerTestUser1',
      steamID: BigInt(NUM_RUNS * Math.floor(Math.random() * 100000))
    }
  });
  const newUser2 = await prisma.user.create({
    data: {
      alias: 'TriggerTestUser2',
      steamID: BigInt(NUM_RUNS * Math.floor(Math.random() * 100000))
    }
  });

  console.time('Insert with trigger at start');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "LeaderboardRun" ("userID", "mapID", "gamemode", "trackType", "trackNum", "style", "time", "splits")
    VALUES (${newUser1.id}, ${mapID}, 0, 0, 0, 0, 0.1, '{}'::json);
  `);
  console.timeEnd('Insert with trigger at start');

  console.time('Insert with trigger near end');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "LeaderboardRun" ("userID", "mapID", "gamemode", "trackType", "trackNum", "style", "time", "splits")
    VALUES (${newUser2.id}, ${mapID}, 0, 0, 0, 0, ${Math.floor(NUM_RUNS * 0.9)}, '{}'::json);
  `);
  console.timeEnd('Insert with trigger near end');

  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS leaderboard_rank_insert ON "LeaderboardRun";'
  );
  await prisma.$executeRawUnsafe(
    'DROP FUNCTION IF EXISTS assign_leaderboard_rank();'
  );
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS "LeaderboardRun_rank_idx";'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LeaderboardRun" DROP COLUMN IF EXISTS "rank";'
  );
}

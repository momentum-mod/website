import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Gamemode, Role, Style, TrackType } from '@momentum/constants';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import { app, req, db, registerE2ETestFile } from './support/e2e-environment';

// Ladder pages and user existence checks read users through a Valkey cache.
// These check every write path invalidates it, by populating the cache, writing
// through the API, and reading again.
describe('User cache', () => {
  registerE2ETestFile();

  let adminToken, map;

  const ladderEntry = async (userID: number) => {
    const res = await req.get({
      url: `ranks/${Gamemode.AHOP}`,
      query: { take: 100 },
      status: 200
    });
    return res.body.data.find((entry) => entry.userID === userID);
  };

  const userWithPoints = async () => {
    const [user, token] = await db.createAndLoginUser();
    await db.createLbRun({ map, user, time: Math.random() * 100 });

    const ranking = app.get(RankingService);
    await ranking.queueLeaderboardUpdates([
      {
        mapID: map.id,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1,
        style: Style.NORMAL
      }
    ]);
    await ranking.processQueue();

    // Populate the cache.
    assert.equal((await ladderEntry(user.id)).user.alias, user.alias);
    return [user, token] as const;
  };

  before(async () => {
    [, adminToken] = await db.createAndLoginUser({
      data: { roles: Role.ADMIN }
    });
    map = await db.createMap();
  });

  after(async () => {
    await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
  });

  it('should reflect a user renaming themselves', async () => {
    const [user, token] = await userWithPoints();

    await req.patch({
      url: 'user',
      status: 204,
      body: { alias: 'Renamed Barry' },
      token
    });

    assert.equal((await ladderEntry(user.id)).user.alias, 'Renamed Barry');
  });

  it('should reflect an admin changing roles', async () => {
    const [user] = await userWithPoints();

    await req.patch({
      url: `admin/users/${user.id}`,
      status: 204,
      body: { roles: Role.VERIFIED },
      token: adminToken
    });

    assert.equal((await ladderEntry(user.id)).user.roles, Role.VERIFIED);
  });

  it('should reflect a user deleting their account', async () => {
    const [user, token] = await userWithPoints();

    await req.del({ url: 'user', status: 204, token });

    assert.equal((await ladderEntry(user.id)).user.alias, 'Deleted User');
  });

  it('should forget a placeholder once it is merged away', async () => {
    const placeholder = await req.post({
      url: 'admin/users',
      status: 201,
      body: { alias: 'Placeholder Barry' },
      token: adminToken
    });
    const realUser = await db.createUser();

    // Populates the cache with the placeholder.
    await req.get({ url: `users/${placeholder.body.id}/ranks`, status: 200 });

    await req.post({
      url: 'admin/users/merge',
      status: 201,
      body: { placeholderID: placeholder.body.id, userID: realUser.id },
      token: adminToken
    });

    await req.get({ url: `users/${placeholder.body.id}/ranks`, status: 404 });
  });
});

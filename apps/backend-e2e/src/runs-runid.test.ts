import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { PastRunDto } from '../../backend/src/app/dto';
import { NULL_ID } from '@momentum/test-utils';
import { MapStatus } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Runs', () => {
  registerE2ETestFile();

  describe('runs/{runID}', () => {
    describe('GET', () => {
      let user, token, map, run1, run2;

      before(async () => {
        run1 = await db.createPastRun({
          time: 1,
          createLbRun: true,
          lbRank: 1
        });

        user = run1.user;
        map = run1.mmap;

        run2 = await db.createPastRun({
          map: map,
          user: user,
          time: 2
        });
        token = auth.login(user);
      });

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'mMap', 'user');
      });

      it('should return a valid run', async () => {
        await req.get({
          url: `runs/${run1.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });
      });

      it('should include whether the run is a PB', async () => {
        const res = await req.get({
          url: `runs/${run1.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });

        assert.equal(res.body.isPB, true);

        const res2 = await req.get({
          url: `runs/${run2.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });

        assert.equal(res2.body.isPB, false);
      });

      it('should respond with a run using the user include', async () => {
        await req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'user',
          token
        });
      });

      it('should respond with a run using the map include', async () => {
        await req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'map',
          token
        });
      });

      it('should respond with a run using the leaderboardRun include', async () => {
        await req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'leaderboardRun',
          token
        });
      });

      it("should refuse to return non-approved maps the user can't access", async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `runs/${run1.id}`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });
      });

      it('should 404 when no run is found', async () => {
        await req.get({ url: `runs/${NULL_ID}`, status: 404, token });
      });
    });
  });
});

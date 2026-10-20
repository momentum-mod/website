import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin

import {
  validateZoneFile,
  ZonesStub,
  ZonesStubString
} from '@momentum/formats/zone';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/zones', () => {
    describe('GET', () => {
      const zones = ZonesStub;

      let token, map;
      before(async () => {
        await ([token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap({
            versions: {
              create: {
                zones: ZonesStubString,
                versionNum: 1,
                submitter: db.getNewUserCreateData()
              }
            }
          })
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with the map zones', async () => {
        const res = await req.get({
          url: `maps/${map.id}/zones`,
          status: 200,
          token
        });

        const parsed = JSON.parse(res.body);
        assert.partialDeepStrictEqual(parsed, zones);
        assert.doesNotThrow(() => validateZoneFile(parsed));
      });

      it('should 404 if the map does not exist', async () => {
        await req.get({ url: `maps/${NULL_ID}/zones`, status: 404, token });
      });
    });
  });
});

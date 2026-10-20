import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';

// See auth.e2e-spec.ts for justification of this sin
import { MapInfoDto } from '../../backend/src/app/dto';
import { MapStatus } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/info', () => {
    describe('GET', () => {
      let token, map;

      before(async () => {
        await ([token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap()
        ]));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with map info', async () => {
        await req.get({
          url: `maps/${map.id}/info`,
          status: 200,
          validate: MapInfoDto,
          token
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/info`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return 404 if the map is not found', async () => {
        await req.get({ url: `maps/${NULL_ID}/info`, status: 404, token });
      });
    });
  });
});

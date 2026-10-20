import { after, before, describe, it } from 'node:test';
import { MapCreditDto } from '../../backend/src/app/dto';
import { MapCreditType, MapStatus, Role } from '@momentum/constants';
import { req, db, registerE2ETestFile } from './support/e2e-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('users/{userID}/credits', () => {
    describe('GET', () => {
      let user, token, modToken;

      before(async () => {
        [user, token] = await db.createAndLoginUser();
        modToken = await db.loginNewUser({ data: { roles: Role.MODERATOR } });
        await db.createMaps(2, {
          credits: { create: { type: MapCreditType.AUTHOR, userID: user.id } }
        });
        await db.createMap({
          credits: { create: { type: MapCreditType.AUTHOR, userID: user.id } },
          status: MapStatus.PRIVATE_TESTING
        });
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with a list of map credits for approved maps for a specific user', async () => {
        await req.get({
          url: `users/${user.id}/credits`,
          status: 200,
          validatePaged: { type: MapCreditDto, count: 2 }
        });
      });

      it('should respond with a full list of map credits if local user is the same as requested user', async () => {
        await req.get({
          url: `users/${user.id}/credits`,
          status: 200,
          validatePaged: { type: MapCreditDto, count: 3 },
          token
        });
      });

      it('should respond with a full list of map credits if local user is admin or mod', async () => {
        await req.get({
          url: `users/${user.id}/credits`,
          status: 200,
          validatePaged: { type: MapCreditDto, count: 3 },
          token: modToken
        });
      });

      it('should respond with limited list of credits with take parameter', async () => {
        await req.takeTest({
          url: `users/${user.id}/credits`,
          validate: MapCreditDto,
          token
        });
      });

      it('should respond with different list of credits with skip parameter', async () => {
        await req.skipTest({
          url: `users/${user.id}/credits`,
          validate: MapCreditDto,
          token
        });
      });

      it('should respond with list of credits with map expand', async () => {
        await req.expandTest({
          url: `users/${user.id}/credits`,
          expand: 'map',
          validate: MapCreditDto,
          paged: true,
          token
        });
      });

      it('should respond with list of credits with info expand', async () => {
        await req.expandTest({
          url: `users/${user.id}/credits`,
          expand: 'info',
          expectedPropertyName: 'map.info',
          validate: MapCreditDto,
          paged: true,
          token
        });
      });
    });
  });
});

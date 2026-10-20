import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { MapDto } from '../../backend/src/app/dto';
import { MapCreditType } from '@momentum/constants';
import { User } from '@momentum/db';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/maps', () => {
    describe('GET', () => {
      let u1: User, u1Token: string, u2Token: string;

      before(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);
        await Promise.all([
          db.createMap({
            name: 'ahop_aaaaaaaa',
            submitter: { connect: { id: u1.id } },
            credits: {
              create: {
                userID: u1.id,
                type: MapCreditType.TESTER
              }
            }
          }),
          db.createMap({
            name: 'ahop_bbbbbbbb',
            submitter: { connect: { id: u1.id } }
          })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should retrieve the list of maps that the user submitted', async () => {
        await req.get({
          url: 'user/maps',
          status: 200,
          token: u1Token,
          validatePaged: { type: MapDto, count: 2 }
        });
      });

      it('should retrieve an empty map list if the user has not submitted any maps', async () => {
        const res = await req.get({
          url: 'user/maps',
          status: 200,
          token: u2Token
        });

        assert.partialDeepStrictEqual(res.body, {
          returnCount: 0,
          totalCount: 0
        });
      });

      it('should retrieve the users submitted maps when using the skip query parameter', async () => {
        await req.skipTest({
          url: 'user/maps',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should retrieve the users submitted maps when using the take query parameter', async () => {
        await req.takeTest({
          url: 'user/maps',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded info', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'info',
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded submitter', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'submitter',
          token: u1Token
        });
      });

      it('should retrieve the submitted maps with expanded credits', async () => {
        await req.expandTest({
          url: 'user/maps',
          validate: MapDto,
          paged: true,
          expand: 'credits',
          token: u1Token,
          some: true
        });
      });

      it('should retrieve a map specified by a search query parameter', async () => {
        await req.searchTest({
          url: 'user/maps',
          token: u1Token,
          validate: { type: MapDto, count: 1 },
          searchPropertyName: 'name',
          searchMethod: 'contains',
          searchString: 'bbb'
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps', 'get');
      });
    });
  });
});

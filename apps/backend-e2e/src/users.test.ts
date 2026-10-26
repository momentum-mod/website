import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
import {
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('users/', () => {
    describe('GET', () => {
      let users, token;

      before(async () => {
        users = await db.createUsers(3);
        token = auth.login(users[0]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with paged list of users', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          validatePaged: { type: UserDto, count: 3 },
          token
        });

        // Quick check we're not sending back stuff that wasn't included.
        // Not doing these for all tests, once or twice can't hurt.
        for (const user of res.body.data)
          assert.ok(!Object.hasOwn(user, 'profile'));
      });

      it('should respond with a paged list of users with take parameter', async () => {
        await req.takeTest({ url: 'users', validate: UserDto, token });
      });

      it('should respond with a paged list of users with skip parameter', async () => {
        await req.skipTest({ url: 'users', validate: UserDto, token });
      });

      it('should respond with a paged list of users with search by alias parameter', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { search: users[0].alias },
          validatePaged: { type: UserDto, count: 1 },
          token
        });

        assert.equal(res.body.data[0].id, users[0].id);
      });

      it('should respond with a paged list of users containing a case-insensitive match on an alias', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { search: users[0].alias.toUpperCase() },
          validatePaged: { type: UserDto, count: 1 },
          token
        });

        assert.equal(res.body.data[0].id, users[0].id);
      });

      it('should search by custom alias rather than Steam alias when a user has a custom alias', async () => {
        const user = await db.createUser({
          data: { realAlias: 'Zeppelin Steam', customAlias: 'Blimp Custom' }
        });

        const res = await req.get({
          url: 'users',
          status: 200,
          query: { search: 'Blimp' },
          validatePaged: { type: UserDto, count: 1 },
          token
        });

        assert.partialDeepStrictEqual(res.body.data[0], {
          id: user.id,
          alias: 'Blimp Custom'
        });
        assert.ok(!Object.hasOwn(res.body.data[0], 'customAlias'));
        assert.ok(!Object.hasOwn(res.body.data[0], 'realAlias'));

        await req.get({
          url: 'users',
          status: 200,
          query: { search: 'Zeppelin' },
          validatePaged: { type: UserDto, count: 0 },
          token
        });

        await prisma.user.delete({ where: { id: user.id } });
      });

      it('should respond with an empty a paged list of users using a search by parameter containing a nonexistent alias', async () => {
        await req.get({
          url: 'users',
          status: 200,
          query: { search: 'Abstract Barry' },
          validatePaged: { type: UserDto, count: 0 },
          token
        });
      });

      it('should respond with a paged list of users with expanded profiles when using an expand parameter', async () => {
        await req.expandTest({
          url: 'users',
          expand: 'profile',
          validate: UserDto,
          paged: true,
          token
        });
      });

      it('should respond with a paged list of users with expanded stats when using an expand parameter', async () => {
        await req.expandTest({
          url: 'users',
          expand: 'userStats',
          validate: UserDto,
          paged: true,
          token
        });
      });

      it('should respond with an array of one user for a matching SteamID parameter', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { steamID: users[0].steamID },
          validatePaged: { type: UserDto, count: 1 },
          token
        });

        assert.equal(res.body.data[0].id, users[0].id);
      });

      it('should respond with an empty array for a nonexistent SteamID parameter', async () => {
        await req.get({
          url: 'users',
          status: 200,
          query: { steamID: 3141592612921 },
          validatePaged: { type: UserDto, count: 0 },
          token
        });
      });

      it('should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { steamIDs: users[0].steamID + ',' + users[1].steamID },
          validatePaged: { type: UserDto, count: 2 },
          token
        });

        for (const user of res.body.data)
          assert.ok(
            [users[0].steamID, users[1].steamID].includes(BigInt(user.steamID))
          );
      });

      it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', async () => {
        await req.get({
          url: 'users',
          status: 200,
          query: { steamIDs: 1111111111111111 + ',' + 2222222222222222 },
          validatePaged: { type: UserDto, count: 0 },
          token
        });
      });

      it('should respond with an array of multiple users for multiple matching userID parameters', async () => {
        const res = await req.get({
          url: 'users',
          status: 200,
          query: { userIDs: users[0].id + ',' + users[1].id },
          validatePaged: { type: UserDto, count: 2 },
          token
        });

        for (const user of res.body.data)
          assert.ok([users[0].id, users[1].id].includes(user.id));
      });
    });
  });
});

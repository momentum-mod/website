import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { UserDto } from '../../backend/src/app/dto';
import { NULL_ID } from '@momentum/test-utils';
import { steamAvatarUrl } from '@momentum/constants';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('users/{userID}', () => {
    describe('GET', () => {
      let user, token;

      before(async () => {
        await ([user, token] = await db.createAndLoginUser({
          data: {
            alias: 'Arthur Weasley',
            avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
          }
        }));
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should respond with the specified user', async () => {
        const res = await req.get({
          url: `users/${user.id}`,
          status: 200,
          validate: UserDto,
          token
        });

        assert.equal(res.body.alias, 'Arthur Weasley');
      });

      it('should respond with the specified user with a valid avatarURL', async () => {
        const res = await req.get({
          url: `users/${user.id}`,
          status: 200,
          validate: UserDto,
          token
        });

        assert.equal(
          res.body.avatarURL,
          steamAvatarUrl('ac7305567f93a4c9eec4d857df993191c61fb240')
        );
      });

      it('should respond with the specified user with expanded profile when using an expand parameter', async () => {
        await req.expandTest({
          url: `users/${user.id}`,
          validate: UserDto,
          expand: 'profile',
          token
        });
      });

      it('should 404 if the user is not found', async () => {
        await req.get({ url: `users/${NULL_ID}`, status: 404, token });
      });
    });
  });
});

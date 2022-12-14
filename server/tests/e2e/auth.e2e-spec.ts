// noinspection DuplicatedCode

import request from 'supertest';

describe('Auth', () => {
    describe('GET /auth', () => {
        describe('GET /auth/steam', () => {
            it('should redirect to steam login', async () => {
                await request(global.server)
                    .get('/auth/steam')
                    .expect(302)
                    .expect('Location', /^https:\/\/steamcommunity.com\/openid\/login.+/)
            });
        });
    });

    // TODO: We should try and add many more tests here, I'm just unsure how best to bypass the Passport
    // IIRC there's some good info on SO so check that out in the future, once/if we've moved to Fastify.
});

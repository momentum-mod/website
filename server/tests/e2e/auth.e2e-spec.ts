﻿// noinspection DuplicatedCode

import request from 'supertest';

describe('Auth', () => {
    describe('GET /auth', () => {
        describe('GET /auth/steam', () => {
            it('should redirect to steam login', async () => {
                await request(global.server)
                    .get('/auth/steam')
                    .expect(302)
                    .expect('Location', /^https:\/\/steamcommunity.com\/openid\/login.+/);
            });
        });
    });

    // TODO: We should try and add many more tests here, I'm just unsure how best to bypass the Passport
    // IIRC there's some good info on SO so check that out in the future, once/if we've moved to Fastify.

    // Old API tests, not fully ported:
    // 		it('should generate a valid access token', () => {
    // 			return auth.genAccessToken({
    // 				id: testUser.id,
    // 				roles: testUser.roles,
    // 				bans: testUser.bans,
    // 			}).then(token => {
    // 				return verifyJWT(token, config.accessToken.secret);
    // 			}).then(decodedToken => {
    // 				expect(decodedToken).toHaveProperty('id');
    // 				expect(decodedToken).toHaveProperty('roles');
    // 			});
    // 		});
    //
    // 		it('should generate a refresh token that expires in a week', () => {
    // 			return auth.createRefreshToken({
    // 				id: testUser.id,
    // 				roles: testUser.roles,
    // 				bans: testUser.bans,
    // 			}, false).then(refreshToken => {
    // 				return verifyJWT(refreshToken, config.accessToken.secret);
    // 			}).then(decodedRefreshToken => {
    // 				expect(decodedRefreshToken).toHaveProperty('iat');
    // 				expect(decodedRefreshToken).toHaveProperty('exp');
    //
    // 				// week (7d) in vercel/ms -> 6.048e+8 / 1000
    // 				const ms = 604800;
    //
    // 				// iat+ms should equal exp
    // 				expect(decodedRefreshToken.iat+ms).toEqual(decodedRefreshToken.exp);
    // 			});
    // 		})
    // 	});
    //
    // 	describe('endpoints', () => {
    //
    // 		describe('GET /auth/steam', () => {
    // 			it('should redirect to steam login', () => {
    // 				return chai.request(server)
    // 				.get('/auth/steam')
    // 				.then(res => {
    // 					expect(res).to.redirect;
    // 					expect(res).to.have.status(200);
    // 				});
    // 			});
    // 		});
    //
    // 		describe('GET /auth/steam/return', () => {
    // 			it('should redirect to steam login', () => {
    // 				return chai.request(server)
    // 				.get('/auth/steam/return')
    // 				.then(res => {
    // 					expect(res).to.redirect;
    // 					expect(res).to.have.status(200);
    // 				});
    // 			});
    // 		});
    //
    //
    //
    // 		// Add/Fix tests for other types of authentication
    // /*
    // 		describe('GET /auth/twitter', () => {
    // 			it('should redirect to twitter login', () => {
    //                 return chai.request(server)
    //                     .get('/auth/twitter')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    // 		describe('GET /auth/twitter/return', () => {
    // 			it('should return 200 if twitter account is successfully linked', () => {
    //                 return chai.request(server)
    //                     .get('/auth/twitter/return')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    // 		describe('GET /auth/discord', () => {
    // 			it('should redirect to discord oauth url', () => {
    //                 return chai.request(server)
    //                     .get('/auth/discord')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    //         describe('GET /auth/discord/return', () => {
    //             it('should return 200 if discord account is successfully linked', () => {
    //                 return chai.request(server)
    //                     .get('/auth/discord/return')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    //         describe('GET /auth/twitch', () => {
    //         	it('should redirect to twitch oauth url', () => {
    //                 return chai.request(server)
    //                     .get('/auth/twitch')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    //         describe('GET /auth/twitch/return', () => {
    //             it('should return 200 if twitch account is successfully linked', () => {
    //                 return chai.request(server)
    //                     .get('/auth/twitch/return')
    //                     .then(res => {
    //                         expect(res).to.redirect;
    //                         expect(res).to.have.status(200);
    //                     });
    // 			});
    // 		});
    //
    // 		*/
    //
    // 		describe('POST /auth/refresh', () => {
    //             it('should 401 when a bad refresh token is provided', () => {
    //                 return chai.request(server)
    //                 .post('/auth/refresh')
    //                 .send({ refreshToken: 'xD.xD.xD' })
    //                 .then(res => {
    //                     expect(res).to.have.status(401);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('error');
    //                 });
    //             });
    //             it('should respond with a new access token', () => {
    //                 return chai.request(server)
    //                 .post('/auth/refresh')
    //                 .send({ refreshToken: testUser.auth.refreshToken })
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(typeof res.body).toBe('string');
    //                 });
    //             });
    //         });
    //
    //         describe('POST /auth/revoke', () => {
    //             it('should 400 when no auth header is provided', () => {
    //                 return chai.request(server)
    //                 .post('/auth/revoke')
    //                 .then(res => {
    //                     expect(res).to.have.status(400);
    //                 });
    //             });
    //             it('should 401 when the auth header is invalid', () => {
    //                 return chai.request(server)
    //                 .post('/auth/revoke')
    //                 .set('Authorization', 'Bearer xD.xD.xD')
    //                 .then(res => {
    //                     expect(res).to.have.status(401);
    //                 });
    //             });
    //             it('should 204 when the auth header is valid', () => {
    //                 return chai.request(server)
    //                 .post('/auth/revoke')
    //                 .set('Authorization', 'Bearer ' + accessToken)
    //                 .then(res => {
    //                     expect(res).to.have.status(204);
    //                 });
    //             });
    //             it('should make the refresh token unusable on success', () => {
    //                 return chai.request(server)
    //                 .post('/auth/refresh')
    //                 .send({ refreshToken: testUser.auth.refreshToken })
    //                 .then(res => {
    //                     expect(res).to.have.status(401);
    //                     expect(res).to.be.json;
    //                 });
    //             });
    //         });
});

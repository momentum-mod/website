'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, UserAuth } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	jwt = require('jsonwebtoken'),
	util = require('util'),
	verifyJWT = util.promisify(jwt.verify),
	config = require('../config/config'),
	server = require('../server'),
	auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('auth', () => {

	let accessToken = null;
	const testUser = {
		id: '2759389285395352',
		permissions: 0,
		auth: {},
	};

	before(() => {
		return forceSyncDB().then(() => {
			return auth.genAccessToken(testUser);
		}).then(token => {
			accessToken = token;
            return User.create(testUser, { include: [{ model: UserAuth, as: 'auth' }]});
		}).then(() => {
            return auth.createRefreshToken(testUser);
        }).then(refreshToken => {
            testUser.auth.refreshToken = refreshToken;
            return Promise.resolve();
        });
	});

	after(() => {
		return forceSyncDB();
	});

	describe('modules', () => {
		it('should generate a valid access token', () => {
			return auth.genAccessToken({
				id: testUser.id,
				permissions: testUser.permissions
			}).then(token => {
				return verifyJWT(token, config.accessToken.secret);
			}).then(decodedToken => {
				expect(decodedToken).to.have.property('id');
				expect(decodedToken).to.have.property('permissions');
			});
		});
	});

	describe('endpoints', () => {

		describe('GET /auth/steam', () => {
			it('should redirect to steam login', () => {
				return chai.request(server)
				.get('/auth/steam')
				.then(res => {
					expect(res).to.redirect;
					expect(res).to.have.status(200);
				});
			});
		});

		describe('GET /auth/steam/return', () => {
			it('should redirect to steam login', () => {
				return chai.request(server)
				.get('/auth/steam/return')
				.then(res => {
					expect(res).to.redirect;
					expect(res).to.have.status(200);
				});
			});
		});



		// Add/Fix tests for other types of authentication
/*
		describe('GET /auth/twitter', () => {
			it('should redirect to twitter login', () => {
                return chai.request(server)
                    .get('/auth/twitter')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});
		describe('GET /auth/twitter/return', () => {
			it('should return 200 if twitter account is successfully linked', () => {
                return chai.request(server)
                    .get('/auth/twitter/return')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});
		describe('GET /auth/discord', () => {
			it('should redirect to discord oauth url', () => {
                return chai.request(server)
                    .get('/auth/discord')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});
        describe('GET /auth/discord/return', () => {
            it('should return 200 if discord account is successfully linked', () => {
                return chai.request(server)
                    .get('/auth/discord/return')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});
        describe('GET /auth/twitch', () => {
        	it('should redirect to twitch oauth url', () => {
                return chai.request(server)
                    .get('/auth/twitch')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});
        describe('GET /auth/twitch/return', () => {
            it('should return 200 if twitch account is successfully linked', () => {
                return chai.request(server)
                    .get('/auth/twitch/return')
                    .then(res => {
                        expect(res).to.redirect;
                        expect(res).to.have.status(200);
                    });
			});
		});

		*/

		describe('POST /auth/refresh', () => {
            it('should respond with a 403 when a bad refresh token is provided', () => {
                return chai.request(server)
                .post('/auth/refresh')
                .send({ refreshToken: 'xD.xD.xD' })
                .then(res => {
                    expect(res).to.have.status(401);
                    expect(res).to.be.json;
                    expect(res.body).to.have.property('error');
                });
            });
            it('should respond with a new access token', () => {
                return chai.request(server)
                .post('/auth/refresh')
                .send({ refreshToken: testUser.auth.refreshToken })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.have.property('accessToken').that.is.a('string');
                });
            });
        });

        describe('POST /auth/revoke', () => {
            it('should respond with a 400 when no auth header is provided', () => {
                return chai.request(server)
                .post('/auth/revoke')
                .then(res => {
                    expect(res).to.have.status(400);
                });
            });
            it('should respond with a 401 when the auth header is invalid', () => {
                return chai.request(server)
                .post('/auth/revoke')
                .set('Authorization', 'Bearer xD.xD.xD')
                .then(res => {
                    expect(res).to.have.status(401);
                });
            });
            it('should respond with a 204 when the auth header is valid', () => {
				console.log(accessToken);
                return chai.request(server)
                .post('/auth/revoke')
                .set('Authorization', 'Bearer ' + accessToken)
                .then(res => {
                    expect(res).to.have.status(204);
                });
            });
            it('should make the refresh token unusable on success', () => {
                return chai.request(server)
                .post('/auth/refresh')
                .send({ refreshToken: testUser.auth.refreshToken })
                .then(res => {
                    expect(res).to.have.status(401);
                    expect(res).to.be.json;
                });
            });
        });

	});

});

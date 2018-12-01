'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	jwt = require('jsonwebtoken'),
	util = require('util'),
	verifyJwt = util.promisify(jwt.verify),
	config = require('../config/config'),
	server = require('../server'),
	auth = require('../src/models/auth');

	chai.use(chaiHttp);

describe('auth', () => {

	const testUser = {
		id: '2759389285395352',
		permissions: 0
	};

	describe('modules', () => {
		it('should generate a valid access token', () => {
			return auth.genAccessToken({
				id: testUser.id,
				permissions: testUser.permissions
			}).then(token => {
				return verifyJwt(token, config.accessToken.secret);
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

	});

});

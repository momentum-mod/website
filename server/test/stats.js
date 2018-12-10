'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('activities', () => {

    let accessToken = null;
    let adminAccessToken = null;
    const testUser = {
        id: '76561198131664084',
        permissions: 0,
        profile: {
            alias: 'cjshiner',
            avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
            bio: 'test',
        }
    };

    before(() => {
        return forceSyncDB()
            .then(() => {
                return auth.genAccessToken(testUser);
            }).then((token) => {
                accessToken = token;
                testUser.permissions = 6;
                return auth.genAccessToken(testUser);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testUser);
            });
    });

    after(() => {
        return forceSyncDB();
    });

    describe('modules', () => {

    });

    describe('endpoints', () => {

        describe('GET /api/stats/global', () => {
			it('should return global base stats', () => {
				return chai.request(server)
					.get('/api/stats/global')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('totalJumps');
						expect(res.body).to.have.property('totalStrafes');
						expect(res.body).to.have.property('runsSubmitted');
					});
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/stats/global')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});

		describe('GET /api/stats/global/maps', () => {
			it('should return global map stats', () => {
				return chai.request(server)
					.get('/api/stats/global/maps')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('totalCompletedMaps');
						expect(res.body).to.have.property('totalMaps');
						expect(res.body).to.have.property('topSubscribedMap');
						expect(res.body).to.have.property('topPlayedMap');
						expect(res.body).to.have.property('topDownloadedMap');
						expect(res.body).to.have.property('topUniquelyCompletedMap');
					});
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/stats/global/maps')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});

	});

});

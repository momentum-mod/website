'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Activity, Map, MapInfo, MapCredit, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map'),
    user = require('../src/models/user'),
	activity = require('../src/models/activity');

chai.use(chaiHttp);

describe('activities', () => {


    let accessToken = null;
    let adminAccessToken = null;
	const testUser = {
        id: '00000000000000001',
        roles: 0,
        bans: 0,
    };
    const testUser2 = {
        id: '76561198131664084',
		alias: 'cjshiner',
		avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
        roles: 0,
        bans: 0,
        profile: {
            bio: 'test',
        }
    };
    const testMap = {
        name: 'test_map',
		statusFlag: map.STATUS.PENDING,
	    info: {
		    description: 'newmap_5',
		    numBonuses: 1,
		    numZones: 1,
		    difficulty: 2,
		    isLinear: false,
		    creationDate: new Date(),
	    },
		credits: [{
			userID: testUser2.id,
			type: map.CreditType.AUTHOR,
		}]
    };

	const testActivities = [
		{
	        userID: testUser.id,
	        data: 122,
			type: activity.ACTIVITY_TYPES.MAP_APPROVED,
	    },
		{
	        userID: testUser2.id,
	        data: 223,
			type: activity.ACTIVITY_TYPES.MAP_UPLOADED,
	    },
		{
	        userID: testUser2.id,
	        data: 125,
			type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
	    }
	];

    before(() => {
        return forceSyncDB()
            .then(() => {
                return auth.genAccessToken(testUser2);
            }).then((token) => {
                accessToken = token;
                testUser2.roles |= user.Role.ADMIN;
                return auth.genAccessToken(testUser2);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testUser2);
            }).then(user2 => {
				return User.create(testUser);
			}).then(user => {
                return Map.create(testMap, {
                    include: [
						{ model: MapInfo, as: 'info' },
						{ model: MapCredit, as: 'credits' }
					]
                });
            }).then(map => {
				testMap.id = map.id;
				return Activity.bulkCreate(testActivities);
			});
    });

    after(() => {
        return forceSyncDB();
    });

    describe('modules', () => {

    });

    describe('endpoints', () => {

        describe('GET /api/activities', () => {
			it('should respond with an activity for an author after a map is approved', () => {
				return chai.request(server)
					.patch('/api/admin/maps/' + testMap.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({ statusFlag: map.STATUS.APPROVED })
					.then(res => {
						return chai.request(server)
							.get('/api/activities')
							.set('Authorization', 'Bearer ' + accessToken)
							.query({ data: testMap.id })
							.then(res2 => {
								expect(res).to.have.status(204);
								expect(res2).to.have.status(200);
								expect(res2).to.be.json;
								expect(res2.body).to.have.property('activities');
		                        expect(res2.body.activities).to.be.an('array');
								expect(res2.body.activities).to.have.lengthOf(1);
								expect(res2.body.activities[0].userID).to.equal(testUser2.id);
							});
					});
			});

            it('should respond with a list of activities', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            it('should respond with a limited list of activities when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ limit: 1 })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.lengthOf(1);
                    });
            });
            it('should respond with a different list of activities when using the offset query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ offset: 0, limit: 1 })
                    .then(res => {
						return chai.request(server)
		                    .get('/api/activities')
		                    .set('Authorization', 'Bearer ' + accessToken)
		                    .query({ offset: 2, limit: 1 })
		                    .then(res2 => {
								expect(res).to.have.status(200);
		                        expect(res).to.be.json;
		                        expect(res.body).to.have.property('activities');
		                        expect(res.body.activities).to.be.an('array');
								expect(res.body.activities).to.have.lengthOf(1);
		                        expect(res2).to.have.status(200);
		                        expect(res2).to.be.json;
		                        expect(res2.body).to.have.property('activities');
		                        expect(res2.body.activities).to.be.an('array');
								expect(res2.body.activities).to.have.lengthOf(1);
								expect(res.body.activities[0].id).to.not.equal(res2.body.activities[0].id);
							});
                    });
            });
            it('should respond with a filtered list of activities when using the userID query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ userID: testUser.id })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.lengthOf(1);
                    });
            });
            it('should respond with a filtered list of activities when using the type query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ type: activity.ACTIVITY_TYPES.WR_ACHIEVED })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.lengthOf(1);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/activities')
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

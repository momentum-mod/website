'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage, Run, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
    user = require('../src/models/user'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map'),
	run = require('../src/models/run');


chai.use(chaiHttp);

let fs = require('fs');

describe('runs', () => {

    let accessToken = null;
    let adminAccessToken = null;
    let adminGameAccessToken = null;
    const testUser = {
        id: '00000000000000001',
        roles: user.Role.VERIFIED,
        bans: 0,
    };
    const testAdmin = {
        id: '00000000000000002',
        roles: user.Role.ADMIN,
        bans: 0,
    };
    const testAdminGame = {
        id: '00000000000000003',
        roles: user.Role.ADMIN,
        bans: 0,
    };

    const testMap = {
        name: 'test_map',
        submitterID: testUser.id,
        id: 1,
	    info: {
		    description: 'newmap_5',
		    numTracks: 1,
		    creationDate: new Date(),
	    },
	    tracks: [{
		    trackNum: 0,
		    numZones: 1,
		    isLinear: false,
		    difficulty: 5,
	    }],
        credits: {
            id: 1,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
        images: {
            id: 1,
            URL: 'https://media.moddb.com/cache/images/mods/1/29/28895/thumb_620x2000/Wallpaper.jpg'
        }
    };

	before(() => {
        return forceSyncDB()
            .then(() => {
                return auth.genAccessToken(testUser);
            }).then((token) => {
                accessToken = token;
                return User.create(testUser);
            }).then(() => {
                testAdmin.roles |= user.Role.ADMIN;
                return auth.genAccessToken(testAdmin);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testAdmin);
            }).then(() => {
                testAdminGame.roles |= user.Role.ADMIN;
                return auth.genAccessToken(testAdminGame, true);
            }).then((token) => {
                adminGameAccessToken = token;
                return User.create(testAdminGame);
            })
            .then(() => {
                return Map.create(testMap, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model : MapCredit, as: 'credits'},
                        {  model: MapImage, as: 'images'}
                    ]
                })
            })
            .then(() => {

            })


	});

	after(() => {
        return forceSyncDB();
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {
        // submit same run again
	/*	describe('GET /api/runs', () => {
		    it('should respond with a list of runs', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        return chai.request(server)
                            .post('/api/maps/' + testMap.id + '/runs')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .set('Content-Type', 'application/octet-stream')
                            .send(
                                fs.readFileSync('test/testRun.momrec')
                            )
                            .then(res2 => {
                                return chai.request(server)
                                    .post('/api/maps/' + testMap.id + '/runs')
                                    .set('Authorization', 'Bearer ' + accessToken)
                                    .set('Content-Type', 'application/octet-stream')
                                    .send(
                                        fs.readFileSync('test/testRun.momrec')
                                    )
                                    .then(res3 => {
                                        return chai.request(server)
                                            .get('/api/runs')
                                            .set('Authorization', 'Bearer ' + accessToken)
                                            .then(res4 => {
                                                expect(res).to.have.status(200);
                                                expect(res2).to.have.status(200);
                                                expect(res3).to.have.status(200);
                                                expect(res4).to.have.status(200);
                                                expect(res4).to.be.json;
                                                expect(res4.body.runs).to.have.length(2);
                                            });

                                    });
                            });
                    });

		    });

			it('should respond with a limited list of runs when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({limit: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.runs).to.have.length(1);
                    });
            });
			it('should respond with a different list of runs when using the offset query param', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({offset: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.runs).to.have.length(1);
                    });
            });
			it('should respond with a filtered list of runs when using the playerID query param', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({playerID: testUser.id})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.runs).to.have.length(2);
                    });
            });
			it('should respond with a filtered list of runs when using the flags query param', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({flags: 0})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.runs).to.have.length(2);
                    });
            });
			it('should respond with a filtered list of runs when using the mapID query param' , () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({mapID: testMap.id})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.runs).to.have.length(2);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});

		describe('GET /api/runs/{runID}', () => {
			// Returns 200
			it('should respond with a 404 when the run is not found', () => {
                return chai.request(server)
                    .get('/api/runs/9191')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                       // expect(res).to.have.status(404);
                       // expect(res).to.be.json;
                       // expect(res.body).to.have.property('error');
                       // expect(res.body.error.code).equal(404);
                       // expect(res.body.error.message).to.be.a('string');
                        expect(res).to.have.status(200);
                    });
			});
			it('should respond with the run', () => {
                return chai.request(server)
                    .get('/api/runs/1')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('isPersonalBest')
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/runs/1')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});

		describe('GET /api/runs/{runID}/download', () => {
			it('should respond with a 405 when using this endpoint', () => {
                return chai.request(server)
                    .get('/api/runs/9191/download')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(405);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(405);
                        expect(res.body.error.message).to.be.a('string');
                    });
			});

		});

*/
	});


});

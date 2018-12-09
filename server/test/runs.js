'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
    user = require('../src/models/user'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map');
//	run = require('../src/models/run');

chai.use(chaiHttp);

describe('runs', () => {

    let accessToken = null;
    let adminAccessToken = null;
    let adminGameAccessToken = null;
    const testUser = {
        id: '1',
        permissions: user.Permission.VERIFIED
    };
    const testAdmin = {
        id: '2',
        permissions: user.Permission.ADMIN
    };
    const testAdminGame = {
        id: '3',
        permissions: user.Permission.ADMIN
    };

    const testMap = {
        name: 'test_map',
        id: 1,
	    info: {
		    description: 'newmap_5',
		    numBonuses: 1,
		    numZones: 1,
		    difficulty: 2,
		    isLinear: false,
		    creationDate: new Date(),
	    },
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
                testAdmin.permissions = user.Permission.ADMIN;
                return auth.genAccessToken(testAdmin);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testAdmin);
            }).then(() => {
                testAdminGame.permissions = user.Permission.ADMIN;
                return auth.genAccessToken(testAdminGame, true);
            }).then((token) => {
                adminGameAccessToken = token;
                return User.create(testAdminGame);
            })
            .then(user => {
                return Map.create(testMap, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model : MapCredit, as: 'credits'},
                        {  model: MapImage, as: 'images'}
                    ]
                })
            })


	});

	after(() => {
        return forceSyncDB();
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('POST /api/runs', () => {
/*
			it('should return a 400 when no run file is provided', () => {
				return chai.request(server)
					.post('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
					.type('form')
					.send(null)
                    .then(res => {
                        expect(res).to.have.status(400);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(400);
                        expect(res.body.error.message).to.be.a('string');
                    });
			});
*/
			it('should return a 400 when the run file is invalid');
			it('should return a 409 when the map is not accepting submissions');
			it('should create a new run');
		});

		describe('GET /api/runs', () => {
			it('should respond with a list of runs');
			it('should respond with a limited list of runs when using the limit query param');
			it('should respond with a different list of runs when using the offset query param');
			it('should respond with a filtered list of runs when using the playerID query param');
			it('should respond with a filtered list of runs when using the flags query param');
			it('should respond with a filtered list of runs when using the mapID query param');
            it('should respond with a filtered list of runs when using the isPersonalBest query param');
		});

		describe('GET /api/runs/{runID}', () => {
			// Returns 200
		/*	it('should respond with a 404 when the run is not found', () => {
                return chai.request(server)
                    .get('/api/runs/9191')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
			}); */
			it('should respond with the run');
		});

		describe('GET /api/runs/{runID}/download', () => {
			/*
			it('should respond with a 404 when the run is not found', () => {
                return chai.request(server)
                    .get('/api/runs/9191/download')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
			});
			*/
			it('should download the run replay file');
		});


	});

});

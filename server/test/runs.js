'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage, Run, RunStats, User } = require('../config/sqlize'),
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

   // let runFile = {
    //    fileName: "triggertests-1544253465-5.802.momrec",
   // };

    let testRunFile = fs.readFileSync(__dirname + '/triggertests-1544253465-5.802.momrec');
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

    const testRun = {
        id: testUser.id,
        isPersonalBest: true,
        tickrate: 60,
       //  dateAchieved:
        // time:
        // flags:
        // file:
         playerID: 1,
         mapID: 1,
        // createdAt:
        // updatedAt:
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
            .then(() => {
                return Map.create(testMap, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model : MapCredit, as: 'credits'},
                        {  model: MapImage, as: 'images'}
                    ]
                })
            })
            .then((user) => {

                return Run.create(testUser.id, testMap.id,  testRunFile)

                // return Run.create(testUser.id, testMap.id, runFile)
                    //fs.readFileSync('test/triggertests-1544253465-5.802.momrec'))
            })


	});

	after(() => {
        return forceSyncDB();
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('GET /api/runs', () => {
			it('should respond with a list of runs', () => {
                return chai.request(server)
                    .get('/api/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                      //  expect(res.body.runs).to.have.length(1);
                    });
            });
			it('should respond with a limited list of runs when using the limit query param');
			it('should respond with a different list of runs when using the offset query param');
			it('should respond with a filtered list of runs when using the playerID query param');
			it('should respond with a filtered list of runs when using the flags query param');
			it('should respond with a filtered list of runs when using the mapID query param');
            it('should respond with a filtered list of runs when using the isPersonalBest query param');
		});

		describe('GET /api/runs/{runID}', () => {
	/*		// Returns 200
			it('should respond with a 404 when the run is not found', () => {
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

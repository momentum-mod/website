'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage, MapStats, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
    user = require('../src/models/user'),
	auth = require('../src/models/auth'),
    map = require('../src/models/map');

chai.use(chaiHttp);

let fs = require('fs');

describe('maps', () => {

	let accessToken = null;
	let adminAccessToken = null;
	let adminGameAccessToken = null;
	const testUser = {
		id: '1',
		permissions: user.Permission.VERIFIED,
		country: 'US',
	};
    const testAdmin = {
        id: '3',
        permissions: user.Permission.ADMIN,
	    country: 'US',
    };
    const testAdminGame = {
        id: '222',
        permissions: user.Permission.ADMIN,
	    country: 'US',
    };

	const testMap = {
		name: 'test_map',
		type: map.MAP_TYPE.UNKNOWN,
		id: 8888,
        statusFlag: map.STATUS.APPROVED,
        submitterID: testUser.id,
		info: {
			description: 'My first map!!!!',
			numBonuses: 1,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
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
		},
        stats: {
            id: 1,
            totalReviews: 1,
        }
	};

    const testMap2 = {
        id: 222,
        name: 'test_map_two',
	    type: map.MAP_TYPE.BHOP,
        statusFlag: map.STATUS.APPROVED,
        submitterID: testUser.id,
	    info: {
		    description: 'My test map!!!!',
		    numBonuses: 1,
		    numZones: 1,
		    isLinear: false,
		    difficulty: 5,
		    creationDate: new Date(),
	    },
        credits: {
        	id: 2,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
    	},
        images: {
            id: 3,
            URL: 'http://localhost:3002/img/maps/testmap.jpg'
        }
    };

    const testMap3 = {
        id: 444,
        name: 'test_map_three',
	    type: map.MAP_TYPE.SURF,
        submitterID: testUser.id,
        statusFlag: map.STATUS.NEEDS_REVISION,
	    info: {
		    description: 'test3',
		    numBonuses: 1,
		    numZones: 1,
		    isLinear: false,
		    difficulty: 5,
		    creationDate: new Date(),
	    },
    };

    const uniMap = {
        id: 456,
        name: 'unimap',
	    type: map.MAP_TYPE.RJ,
	    info: {
		    description: 'newmap_5',
		    numBonuses: 1,
		    numZones: 1,
		    difficulty: 2,
		    isLinear: false,
		    creationDate: new Date(),
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
						{  model: MapCredit, as: 'credits'},
						{  model: MapImage, as: 'images'},
                        {  model: MapStats, as: 'stats'}
                    ]
                })
            })
            .then(user => {
                return Map.create(testMap2, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapImage, as: 'images'}
                    ]
                })
            })
            .then(user => {
                return Map.create(testMap3, {
                    include: [
                        {  model: MapInfo, as: 'info',}
                    ]
                })
            })
			.then(user => {
                return Map.create(uniMap, {
                    include: [
                        { model: MapInfo, as: 'info',},
                    ]
                }).then(map => {
				    uniMap.id = map.id;
				    return Promise.resolve();
			    });
            });
	});

	after(() => {
		return forceSyncDB();
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {



		describe('POST /api/maps', () => {
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
				.post('/api/maps')
				.then(res => {
					expect(res).to.have.status(401);
					expect(res).to.be.json;
					expect(res.body).to.have.property('error');
					expect(res.body.error.code).equal(401);
					expect(res.body.error.message).to.be.a('string');
				});
			});
			it('should create a new map', () => {
				return chai.request(server)
				.post('/api/maps')
				.set('Authorization', 'Bearer ' + accessToken)
				.send({
					name: 'test_map_5',
					info: {
						description: 'newmap_5',
						numBonuses: 1,
						numZones: 1,
						difficulty: 2,
						isLinear: false,
						creationDate: new Date(),
					},
					credits: [{
						userID: testUser.id,
						type: map.CreditType.AUTHOR,
					}]
				})
					.then((res) => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('name');
                        expect(res.body.info).to.have.property('description');
					});

			});
		});

        describe('GET /api/maps', () => {
            it('should respond with map data', () => {
                return chai.request(server)
                    .get('/api/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('name');

                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with filtered map data using the limit parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({limit: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with filtered map data using the offset parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({offset: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with filtered map data using the search parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({search: testMap.name})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });

            it('should respond with filtered map data using the submitter id parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({submitterID: testUser.id})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with filtered map data based on the map type', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ type: testMap.type})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with filtered map data using the expand info parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ expand: 'info'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('info');
                        expect(res.body.maps[0].info).to.have.property('description');
                    });
            });

            it('should respond with filtered map data using the expand submitter parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ expand: 'submitter'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('submitter');
                        expect(res.body.maps[0].submitter).to.have.property('permissions');
                    });
            });
            it('should respond with filtered map data using the expand credits parameter', () => {
                return chai.request(server)
                    .get('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ expand: 'credits'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.count).to.equal(2);
                        expect(res.body.maps[0]).to.have.property('credits');
                        expect(res.body.maps[0].credits[0]).to.have.property('type');
                    });
            });
        });

		describe('GET /api/maps/{mapID}', () => {
			it('should respond with 404 when the map is not found', () => {
				return chai.request(server)
				.get('/api/maps/1337')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(404);
					expect(res).to.be.json;
					expect(res.body).to.have.property('error');
					expect(res.body.error.code).equal(404);
					expect(res.body.error.message).to.be.a('string');
				});
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with map data', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                    });
            });

            it('should respond with map data while using the expand info parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'info'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body.info).to.have.property('description');
                    });
            });
            it('should respond with map data while using the expand submitter parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'submitter'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('name');
                        expect(res.body.submitter).to.have.property('permissions');
                    });
            });
            it('should respond with map data while using the expand credits parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'credits'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body.credits[0]).to.have.property('type');
                    });
            });
            it('should respond with map data while using the expand images parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'images'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body.images[0]).to.have.property('URL');
                    });
            });

            it('should respond with map data while using the expand stats parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'stats'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body.stats).to.have.property('totalReviews');
                    });
            });
		});




		describe('GET /api/maps/{mapID}/info', () => {
			it('should respond with map info', () => {
				return chai.request(server)
				.get('/api/maps/' + testMap.id + '/info')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.have.property('description');
				});
			});

			it('should return 404 if the map is not found', () => {
			   return chai.request(server)
                   .get('/api/maps/00091919/info')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .then(res => {
                       expect(res).to.have.status(404);
                       expect(res).to.be.json;
                       expect(res.body).to.have.property('error');
                       expect(res.body.error.code).equal(404);
                       expect(res.body.error.message).to.be.a('string');
                   });

            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/info')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

		});


        describe('PATCH /api/maps/{mapID}/info', () => {
            it('should respond with map info', () => {
                return chai.request(server)
                    .patch('/api/maps/' + testMap.id + '/info')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        description: 'testnewdesc'
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });

            });


            // swagger says this should return 404 if the map is not found,
            // but it won't get past the check for if the map was submitted
            // by that user or not
            it('should return 403 if the map was not submitted by that user', () => {
                return chai.request(server)
                    .patch('/api/maps/00091919/info')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });

            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .patch('/api/maps/' + testMap.id + '/info')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });


        describe('GET /api/maps/{mapID}/credits', () => {
            it('should respond with the specified maps credits', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.mapCredits[0]).to.have.property('type');
                    });
            });
            it('should respond with the specified maps credits with the expand parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
					.query({expand: 'user'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.mapCredits[0]).to.have.property('type');
                        expect(res.body.mapCredits[0].user).to.have.property('permissions');
                    });
            });

            // should this return a 404 instead of a 200?
            it('should return 200 with an empty array', () => {
                return chai.request(server)
                    .get('/api/maps/999999999999999/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body.mapCredits).to.have.length(0);
                    });

            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });
        // Note: will only create one credit. if a map has an existing credit than it wont make another
        describe('POST /api/maps/{mapID}/credits', () => {
            it('should create a map credit for the specified map', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id +'/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: map.CreditType.SPECIAL_THANKS,
                        userID: testAdmin.id
                    }).then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('userID');
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id +'/credits')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('GET /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should return the map credit of the specified map', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
						expect(res.body).to.have.property('id');
						expect(res.body).to.have.property('type');
                    });
            });

            it('should return the map credit of the specified map with an expand parameter', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'user'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('type');
                        expect(res.body.user).to.have.property('permissions');
                    });
            });

            it('should return a 404 if the map is not found', () => {
                return chai.request(server)
                    .get('/api/maps/20090909/credits/222')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });


        describe('PATCH /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should update the specified map credit', () => {
                return chai.request(server)
                    .patch('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: map.CreditType.TESTER,
                        userID: testAdmin.id
                    }).then(res => {
                         expect(res).to.have.status(204);
                    });
            });

            it('should return 403 if the map was not submitted by that user', () => {
                return chai.request(server)
                    .patch('/api/maps/3938282929/credits/234532')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: map.CreditType.AUTHOR,
                        userID: testAdmin.id
                    }) .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
               return chai.request(server)
                   .patch('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                   .then(res => {
                       expect(res).to.have.status(401);
                       expect(res).to.be.json;
                       expect(res.body).to.have.property('error');
                       expect(res.body.error.code).equal(401);
                       expect(res.body.error.message).to.be.a('string');
                   });
            });
        });

        describe('DELETE /api/maps/{mapID}/credits{mapCredID}', () => {
            it('should delete the specified map credit', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('PUT /maps/{mapID}/avatar', () => {
            it('should upload and update the avatar for a map', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/avatar')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('avatarFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                    .then(res => {
                        expect(res).to.have.status(200);
                        // needs some expect statements
                    });
            });
            it('should return a 400 if no avatar file is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/avatar')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(400);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(400);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

            it('should return a 403 if the submitter ID does not match the userId', () => {
                 return chai.request(server)
                     .put('/api/maps/12133122/avatar')
                     .set('Authorization', 'Bearer ' + accessToken)
                     .attach('avatarFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                     .then(res => {
                         expect(res).to.have.status(403);
                         expect(res).to.be.json;
                         expect(res.body).to.have.property('error');
                         expect(res.body.error.code).equal(403);
                         expect(res.body.error.message).to.be.a('string');
                     });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/avatar')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });


        describe('POST /maps/{mapID}/images', () => {
            it('should create a map image for the specified map', () => {
                return chai.request(server)
                   .post('/api/maps/' + testMap.id + '/images')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .attach('mapImageFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                   .then(res => {
                       expect(res).to.have.status(200);
                   });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id + '/images')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });




		describe('GET /api/maps/{mapID}/upload', () => {
			it('should respond with the location for where to upload the map file', () => {
				return chai.request(server)
					.get('/api/maps/' + testMap3.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/upload')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});

		describe('POST /maps/{mapID}/upload', () => {
			it('should respond with a 400 when no map file is provided', () => {
				return chai.request(server)
					.post('/api/maps/' + testMap3.id + '/upload')
					.type('form')
					.set('Authorization', 'Bearer ' + accessToken)
					.send(null)
					.then(res => {
						expect(res).to.have.status(400);
						expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(400);
                        expect(res.body.error.message).to.be.a('string');
					});
			});

		    it('should respond with a 403 when the submitterID does not match the userID', () => {
				return chai.request(server)
					.post('/api/maps/12133122/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });

			});


			it('should respond with a 409 when the map is not accepting uploads', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        expect(res).to.have.status(409);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(409);
                        expect(res.body.error.message).to.be.a('string');

                    });
            });

			it('should upload the map file', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap3.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        expect(res).to.have.status(200);

                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap3.id + '/upload')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

		});

		describe('GET /api/maps/{mapID}/download', () => {
			it('should respond with a 404 when the map is not found', () => {
				return chai.request(server)
					.get('/api/maps/12345/download')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(404);
						expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should download the map file', () => {
			    return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/download')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        // needs expect statement to check if response is octet-stream
                    });
            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/download')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});






		describe('GET /api/maps/{mapID}/images', () => {
			it('should respond with a list of images', () => {
				return chai.request(server)
					.get('/api/maps/' + testMap.id + '/images')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.images[0]).to.have.property('URL');
                        expect(res.body.images[0]).to.have.property('mapID');
                        expect(res.body.images[0].mapID).to.equal(testMap.id);
                    });
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/images')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});
		describe('GET /api/maps/{mapID}/images/{imgID}', () => {
			it('should respond with 404 when the image is not found', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/images/12345')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
			});
			it('should respond with image info', () => {
				return chai.request(server)
					.get('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('URL');
                        expect(res.body).to.have.property('mapID');
                        expect(res.body.mapID).to.equal(testMap.id);
                    });
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
		});




        describe('PUT /api/maps/{mapID}/images/{imgID}', () => {

            it('should respond with 404 when the image is not found', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/images/99')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapImageFile', fs.readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

            it('should respond with 400 when no map image is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .type('form')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(400);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(400);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

            it('should update the map image', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapImageFile', fs.readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                    .then(res => {
                        expect(res).to.have.status(204);
                    });

            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('DELETE /api/maps/{mapID}/images/{imgID}', () => {
			it('should delete the map image', () => {
				return chai.request(server)
				.delete('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
			});
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap.id + '/images/' + testMap.images.id)
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

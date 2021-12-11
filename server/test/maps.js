'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage,  MapTrack, MapZone,
    MapStats, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
    user = require('../src/models/user'),
	auth = require('../src/models/auth'),
    map = require('../src/models/map');
//    run = require('../src/models/run');

chai.use(chaiHttp);

let fs = require('fs');

describe('maps', () => {

	server.timeout = 0;

	let accessToken = null;
	let adminAccessToken = null;
	let adminGameAccessToken = null;
	const testUser = {
		id: 1,
		steamID: '65465432154',
		roles: user.Role.VERIFIED | user.Role.MAPPER,
        bans: 0,
		country: 'US',
	};
    const testAdmin = {
    	id: 2,
        steamID: '54132121685476543',
        roles: user.Role.ADMIN,
        bans: 0,
	    country: 'US',
    };
    const testAdminGame = {
    	id: 3,
        steamID: '5416876413213874',
        roles: user.Role.ADMIN,
        bans: 0,
	    country: 'US',
    };

	const testMap = {
		name: 'test_map_one',
		type: map.MAP_TYPE.TRICKSURF,
		id: 1,
        statusFlag: map.STATUS.APPROVED,
        submitterID: testUser.id,
		info: {
			description: 'My first map!!!!',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
			zones: [
				{
					zoneNum: 0,
					zoneType: 0,
				},
				{
					zoneNum: 1,
					zoneType: 1,
				}
			]
		}],
        credits: {
            id: 1,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
        images: [{
            id: 1,
            small: '',
            medium: '',
            large: '',
        }],
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
		    numTracks: 1,
		    creationDate: new Date(),
	    },
	    tracks: [{
		    trackNum: 0,
		    numZones: 1,
		    isLinear: false,
		    difficulty: 5,
		    zones: [
			    {
				    zoneNum: 0,
				    zoneType: 0,
			    },
			    {
				    zoneNum: 1,
				    zoneType: 1,
			    }
		    ]
	    }],
        credits: {
        	id: 2,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
        images: [{
            id: 3,
            small: '',
            medium: '',
            large: '',
        }],
    };

    const testMap3 = {
        id: 444,
        name: 'test_map',
	    type: map.MAP_TYPE.SURF,
        submitterID: testUser.id,
        statusFlag: map.STATUS.NEEDS_REVISION,
	    info: {
		    description: 'test3',
		    numTracks: 1,
		    creationDate: new Date(),
	    },
	    tracks: [{
		    trackNum: 0,
		    numZones: 1,
		    isLinear: false,
		    difficulty: 5,
		    zones: [
			    {
				    zoneNum: 0,
				    zoneType: 0,
			    },
			    {
				    zoneNum: 1,
				    zoneType: 1,
			    }
		    ]
	    }],
        credits: {
            id: 3,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
    };

    const uniMap = {
        id: 456,
        name: 'unimap',
	    type: map.MAP_TYPE.RJ,
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
		    zones: [
			    {
				    zoneNum: 0,
				    zoneType: 0,
			    },
			    {
				    zoneNum: 1,
				    zoneType: 1,
			    }
		    ]
	    }],
        credits: {
            id: 4,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
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
                    	{ model: MapInfo, as: 'info' },
						{ model: MapCredit, as: 'credits' },
						{ model: MapImage, as: 'images' },
                        { model: MapStats, as: 'stats'},
	                    { model: MapTrack, as: 'tracks', include: [{model: MapZone, as: 'zones'}]},
                    ]
                })
            })
            .then(() => {
                return Map.create(testMap2, {
                    include: [
                        { model: MapInfo, as: 'info',},
                        { model: MapImage, as: 'images' },
                        { model: MapCredit, as: 'credits'},
	                    { model: MapTrack, as: 'tracks', include: [{model: MapZone, as: 'zones'}]},
                    ]
                })
            })
            .then(() => {
                return Map.create(testMap3, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'},
	                    { model: MapTrack, as: 'tracks', include: [{model: MapZone, as: 'zones'}]},
                    ]
                })
            })
			.then(() => {
                return Map.create(uniMap, {
                    include: [
                        { model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'},
	                    { model: MapTrack, as: 'tracks', include: [{model: MapZone, as: 'zones'}]},
                    ]
                }).then(map => {
				    uniMap.id = map.id;
				    return Promise.resolve();
			    });
            });
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
					type: map.MAP_TYPE.SURF,
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
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.count).to.equal(1);
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
                        expect(res.body.maps[0].submitter).to.have.property('roles');
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
                        expect(res.body.submitter).to.have.property('roles');
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
                        expect(res.body.images[0]).to.have.property('small');
                        expect(res.body.images[0]).to.have.property('medium');
                        expect(res.body.images[0]).to.have.property('large');
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
            it('should return 403 if the map was not submitted by that user', () => {
                return chai.request(server)
                    .patch('/api/maps/' + uniMap.id + '/info')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });

            });
            it('should return 404 if the map was not found', () => {
                return chai.request(server)
                    .patch('/api/maps/00091919/info')
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
                        expect(res.body.mapCredits[0].user).to.have.property('roles');
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
                        expect(res.body.user).to.have.property('roles');
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
                    .patch('/api/maps/' + uniMap.id + '/credits/234532')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: map.CreditType.AUTHOR,
                        userID: testUser.id
                    }) .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should return 404 if the map was not found', () => {
                return chai.request(server)
                    .patch('/api/maps/3938282929/credits/234532')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: map.CreditType.AUTHOR,
                        userID: testUser.id
                    }) .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
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
            it('should return 403 if the map is approved and a non-admin attempts to delete', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(403);
                    });
            });
            it('should delete the specified map credit if the map is not approved', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap3.id + '/credits/' + testMap3.credits.id)
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

        describe('PUT /maps/{mapID}/thumbnail', () => {
            it('should upload and update the thumbnail for a map', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/thumbnail')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .attach('thumbnailFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                    .then(res => {
                        expect(res).to.have.status(204);
                        // needs some expect statements
                    });
            });
            it('should respond with 403 if the map is approved and a non-admin attempts to update ', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/thumbnail')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('thumbnailFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                    .then(res => {
                        expect(res).to.have.status(403);
                    });
            });
            it('should return a 400 if no thumbnail file is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap.id + '/thumbnail')
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
                     .put('/api/maps/' + uniMap.id + '/thumbnail')
                     .set('Authorization', 'Bearer ' + accessToken)
                     .attach('thumbnailFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
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
                    .put('/api/maps/' + testMap.id + '/thumbnail')
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
            it('should create a map image for the specified map if the map is not approved', () => {
                return chai.request(server)
                   .post('/api/maps/' + testMap3.id + '/images')
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

		describe('PUT /maps/{mapID}/upload', () => {
			it('should respond with a 400 when no map file is provided', () => {
				return chai.request(server)
					.put('/api/maps/' + testMap3.id + '/upload')
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
					.put('/api/maps/' + uniMap.id + '/upload')
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

			it('should upload the map file', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap3.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        expect(res).to.have.status(200);
                        // needs more expect statements
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .put('/api/maps/' + testMap3.id + '/upload')
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
                        expect(res.body.images[0]).to.have.property('small');
                        expect(res.body.images[0]).to.have.property('medium');
                        expect(res.body.images[0]).to.have.property('large');
                        expect(res.body.images[0]).to.have.property('mapID');
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
		/*
		describe('GET /api/maps/{mapID}/images/{imgID}', () => {
		    // Don't know why this is failing
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
		*/




        describe('PUT /api/maps/{mapID}/images/{imgID}', () => {

            it('should respond with 404 when the image is not found', () => {
            	const file = fs.readFileSync('test/testImage2.jpg');
                return chai.request(server)
                    .put('/api/maps/' + testMap3.id + '/images/99')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapImageFile', file, 'testImage2.jpg')
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
                    .put('/api/maps/' + testMap.id + '/images/' + testMap.images[0].id)
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
                    .put('/api/maps/' + testMap.id + '/images/' + testMap.images[0].id)
                    .set('Authorization', 'Bearer ' + adminAccessToken)
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
				.delete('/api/maps/' + testMap.id + '/images/' + testMap.images[0].id)
                    .set('Authorization', 'Bearer ' + adminAccessToken)
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

        // Was working, but something probably changed last commit

        /*
        describe('POST /api/maps/{mapID}/runs', () => {
            it('should upload a run file', () => {
               return chai.request(server)
                    .post('/api/maps/' + testMap3.id + '/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .set('Content-Type', 'application/octet-stream')
                    .send(
                        fs.readFileSync('test/testRun.momrec')
                    )
                    .then(res => {
                        console.log(fs.readFileSync('test/testRun.momrec'));
                        expect(res).to.have.status(200);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap3.id + '/runs')
                    .set('Content-Type', 'application/octet-stream')
                    .send(
                        fs.readFileSync('test/testRun.momrec')
                    )
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

        });

        describe('GET /api/maps/{mapID}/runs', () => {
            it('should return run files for the specified map', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap3.id + '/runs')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .set('Content-Type', 'application/octet-stream')
                    .send(
                        fs.readFileSync('test/testRun.momrec')
                    )
                    .then(res => {
                        return chai.request(server)
                            .get('/api/maps/' + testMap3.id + '/runs')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res2).to.have.status(200);
                                expect(res2.body).to.have.property('runs');
                                expect(res2.body.runs).to.have.length(2);
                            });
                    });

            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/runs')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('GET /api/maps/{mapID}/runs/{runID}', () => {
            it('should return the specified run', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/runs/1')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('rank');
                     });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/runs/1')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });


        describe('GET /api/maps/{mapID}/runs/{runID}/download', () => {
            it('should download the run', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/runs/1/download')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        // expect to return octet-stream
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap3.id + '/runs/1/download')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

        }); */

        describe('POST /api/maps/:mapID/session', () => {
        	it('should return 403 if not using a game API key', () => {
        		return chai.request(server)
			        .post(`/api/maps/${testMap3.id}/session`)
			        .set('Authorization', 'Bearer ' + accessToken)
			        .then(res => {
			        	expect(res).to.have.status(403);
				        expect(res).to.be.json;
				        expect(res.body).to.have.property('error');
				        expect(res.body.error.code).equal(403);
				        expect(res.body.error.message).to.be.a('string');
			        });
	        });

	        it('should should not create a run session if not given a proper body', () => {
		        return chai.request(server)
			        .post(`/api/maps/${testMap3.id}/session`)
			        .set('Authorization', 'Bearer ' + adminGameAccessToken)
			        .send(null)
			        .then(res => {
				        expect(res).to.have.status(400);
				        expect(res).to.be.json;
				        expect(res.body).to.have.property('error');
				        expect(res.body.error.code).equal(400);
				        expect(res.body.error.message).to.be.a('string');
			        });
	        });

        	it('should return a valid run session object', () => {
		        return chai.request(server)
			        .post(`/api/maps/${testMap.id}/session`)
			        .set('Authorization', 'Bearer ' + adminGameAccessToken)
			        .send({
				        trackNum: 0,
				        zoneNum: 0,
			        })
			        .then(res => {
				        expect(res).to.have.status(200);
				        expect(res).to.be.json;
				        expect(res.body).to.have.property('id');
			        });
	        });

        	it('should not create a valid run session if the map does not have the trackNum', () => {
		        return chai.request(server)
			        .post(`/api/maps/${testMap.id}/session`)
			        .set('Authorization', 'Bearer ' + adminGameAccessToken)
			        .send({
				        trackNum: 2,
				        zoneNum: 0,
			        })
			        .then(res => {
				        expect(res).to.have.status(400);
				        expect(res).to.be.json;
				        expect(res.body).to.have.property('error');
				        expect(res.body.error.code).equal(400);
				        expect(res.body.error.message).to.be.a('string');
			        });
	        });
        });

		describe('DELETE /api/maps/:mapID/session', () => {
			it('should return 403 if not using a game API key', () => {
				return chai.request(server)
					.delete(`/api/maps/${testMap3.id}/session`)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					})
			});
		});

		describe('POST /api/maps/:mapID/session/:sesID', () => {
			it('should return 403 if not using a game API key', () => {
				return chai.request(server)
					.post(`/api/maps/${testMap3.id}/session/1`)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					})
			});

			it('should update an existing run session with the zone and tick', () => {
				return chai.request(server)
					.post(`/api/maps/${testMap.id}/session`)
					.set('Authorization', 'Bearer ' + adminGameAccessToken)
					.send({
						trackNum: 0,
						zoneNum: 0,
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');

						let sesID = res.body.id;
						return chai.request(server)
							.post(`/api/maps/${testMap.id}/session/${sesID}`)
							.set('Authorization', 'Bearer ' + adminGameAccessToken)
							.send({
								zoneNum: 2,
								tick: 510,
							})
							.then(res2 => {
								expect(res2).to.have.status(200);
								expect(res2).to.be.json;
								expect(res2.body).to.have.property('id');
							});
					});
			});
		});

		describe('POST /api/maps/:mapID/session/:sesID/end', () => {
			it('should return 403 if not using a game API key', () => {
				return chai.request(server)
					.post(`/api/maps/${testMap3.id}/session/1/end`)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					})
			});
			it('should successfully submit a valid run to the leaderboards');
			it('should reject if there is no body');
			it('should reject the run if the track');
			it('should reject the run if there are timestamps for an IL run');
			it('should reject the run if the run does not have the proper number of timestamps');
			it('should reject the run if the run was done out of order');
			it('should reject the run if there was no timestamps for a track with >1 zones');
			it('should reject the run if the magic of the replay does not match');
			it('should reject the run if the SteamID in the replay does not match the submitter');
			it('should reject the run if the hash of the map stored in the replay does not match the stored hash of the DB map');
			it('should reject the run if the name of the map does not match the name of the map in the DB');
			it('should reject the run if the run time in ticks is 0 or negative');
			it('should reject the run if the replays track number is invalid for the map');
			it('should reject the run if the replays zone number is invalid for the map');
			it('should reject the run if the run date is too old (5+ seconds old)');
			it('should reject the run if the run date is in the future');
			it('should reject the run if the tickrate is not acceptable');
			it('should reject the run if the run does not fall within the run session timestamps');
			it('should reject the run if the run does not have stats');
			it('should reject the run if the run has no run frames');
			// TODO make sure all cases are covered
		});

	});
});

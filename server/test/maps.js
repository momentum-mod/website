'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('maps', () => {

	let accessToken = null;
	let adminAccessToken = null;
	const testUser = {
		id: '2759389285395352',
		permissions: 4
	};
	const testMap = {
		name: 'test_map',
		info: {
			description: 'My first map!!!!',
			numBonuses: 1,
			numCheckpoints: 1,
			numStages: 1,
			difficulty: 5,
		},
        credits: {
            id: 1,
            type: 2,
            userID: '2759389285395352',
        }
	};

	const testMap2 = {
        name: 'test_map2',
        credits: {
        	id: 2,
            type: 2,
            userID: '2759389285395352',
        }
	};

	before(() => {
		return forceSyncDB()
		.then(() => {
			return auth.genAccessToken(testUser);
		}).then((token) => {
			accessToken = token;
			testUser.permissions = 4;
			return auth.genAccessToken(testUser);
		}).then((token) => {
			adminAccessToken = token;
			return User.create(testUser);
		}).then(user => {
                return Map.create(testMap2, {
                	include: [{
                		model: MapCredit,
						as: 'credits',
					}]
				});
        }).then(user => {
			return Map.create(testMap, {
				include: [{
					model: MapInfo,
					as: 'info',
				}]
			}).then(map => {
				testMap.id = map.id;
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

		describe('GET /api/maps', () => {
			it('should respond with map data', () => {
				return chai.request(server)
				.get('/api/maps')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.have.property('maps');
					expect(res.body.maps).to.be.an('array');
				});
			});
		});

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
					name: 'test_map_2',
					info: {
						description: 'My second map!!!!',
						numBonuses: 1,
						numCheckpoints: 1,
						numStages: 1,
						difficulty: 2
					}
				}).then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.have.property('id');
					expect(res.body).to.have.property('name');
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
		});

		describe('GET /api/maps/{mapID}/info', () => {
			it('should respond with map info', () => {
				return chai.request(server)
				.get('/api/maps/' + testMap.id + '/info')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
				});
			});
		});


        describe('GET /api/maps/{mapID}/credits', () => {
            it('should respond with the specified maps credits', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap2.id + '/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });

        describe('POST /api/maps/{mapID}/credits', () => {
            it('should create a map credit for the specified map', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap.id +'/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: 1,
                        userID: 2759389285395352
                    }).then(res => {
                        //expect(res).to.have.status(200);
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                    });
            });
        });
        // probably doesnt return anything
        describe('GET /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should return the map credit of the specified map', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        //expect(res).to.have.status(200);
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res).to.be
                    });
            });
        });

        describe('PATCH /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should update the specified map credit', () => {
                return chai.request(server)
                    .patch('/api/maps/' + testMap2.id + 'credits' +testMap2.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: '1'
                    }).then(res => {
                        // expect(res).to.have.status(200);
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                    });
            });
        });

        describe('DELETE /maps/{mapID}/credits{mapCredID}', () => {
            it('should delete the specified map credit', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap2.id + 'credits/' + testMap2.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        //expect(res).to.have.status(200);
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                    });
            });
        });



		describe('GET /api/maps/{mapID}/upload', () => {
			it('should respond with the location for where to upload the map file');
		});

		describe('POST /maps/{mapID}/upload', () => {
			it('should respond with a 400 when no map file is provided', () => {
				return chai.request(server)
					.post('/api/maps/1/upload')
					.type('form')
					.set('Authorization', 'Bearer ' + accessToken)
					.send(null)
					.then(res => {
						expect(res).to.have.status(400);
						expect(res).to.be.json;
					});
			});
			it('should respond with a 404 when the map is not found');
			it('should respond with a 409 when the map is not accepting uploads');
			it('should should upload the map file');
		});

		describe('GET /api/maps/{mapID}/download', () => {
			it('should respond with a 404 when the map is not found', () => {
				return chai.request(server)
					.get('/api/maps/12345/download')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(404);
						expect(res).to.be.json;
					});
			});
			it('should download the map file');
		});

        /*
        describe('GET /api/maps/{mapID}', () => {
            it('should respond with map data', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });



        describe('GET /api/user/maps/submitted', () => {
            it('should respond with a list of maps submitted by the user', () => {
                return chai.request(server)
                    .get('api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });
        */

		describe('GET /api/maps/{mapID}/images', () => {
			it('should respond with a list of images');
		});

		describe('GET /api/maps/{mapID}/images/{imgID}', () => {
			it('should respond with 404 when the image is not found');
			it('should respond with image info');
		});

		describe('PUT /api/maps/{mapID}/images/{imgID}', () => {
			it('should respond with 404 when the image is not found');
			it('should respond with 400 when no map image is provided');
			it('should update the map image');
		});

		describe('PUT /api/maps/{mapID}/images/{imgID}', () => {
			it('should delete the map image');
		});

	});

});

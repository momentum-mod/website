'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, MapImage, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth'),
	 map = require('../src/models/map');
    // activity = require('../src/models/activity');

chai.use(chaiHttp);

let fs = require('fs');

describe('maps', () => {

	let accessToken = null;
	let adminAccessToken = null;
	let adminGameAccessToken = null;
	const testUser = {
		id: '2759389285395352',
		permissions: 6
	};
    const testAdmin = {
        id: '2759381234567890',
        permissions: 4
    };
    const testAdminGame = {
        id: '222',
        permissions: 4
    };

	const testMap = {
		name: 'test_map',
		type: map.MAP_TYPE.UNKNOWN,
		id: 8888,
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
        },
		images: {
			id: 2,
			URL: 'https://media.moddb.com/cache/images/mods/1/29/28895/thumb_620x2000/Wallpaper.jpg'
		}
	};

    const testMap2 = {
        id: 222,
        name: 'test_map_two',
	    type: map.MAP_TYPE.BHOP,
        info: {
            description: 'My test map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
        	id: 2,
            type: 2,
            userID: '2759389285395352',
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
        info: {
            description: 'test3',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const uniMap = {
        id: 456,
        name: 'unimap',
	    type: map.MAP_TYPE.RJ,
        info: {
            description: 'unimap desc',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const postMap = {
        id: '567890098765',
        name: 'poster',
        info: {
            description: 'poster desc',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 2020,
            type: 2,
            userID: '2759389285395352',
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
                testAdmin.permissions = 4;
                return auth.genAccessToken(testAdmin);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testAdmin);
            }).then(() => {
                testAdminGame.permissions = 4;
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
            .then(user => {
                return Map.create(testMap2, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapImage, as: 'images'}
                        //{  model : MapCredit, as: 'credits'}
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
						description: 'My second map!!!!',
						numBonuses: 1,
						numCheckpoints: 1,
						numStages: 1,
						difficulty: 2
					}
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
                    .patch('/api/admin/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .send({ statusFlag: map.STATUS.APPROVED, submitterId: testUser.id })
                    .then(res => {
                        return chai.request(server)
                            .patch('/api/admin/maps/' + testMap2.id)
                            .set('Authorization', 'Bearer ' + adminAccessToken)
                            .send({ statusFlag: map.STATUS.APPROVED, submitterID: testUser.id })
                            .then(res2 => {
                                return chai.request(server)
                                    .get('/api/maps/')
                                    .set('Authorization', 'Bearer ' + adminAccessToken)
                                    .then(res3 => {
                                        expect(res3).to.have.status(200);
                                        expect(res3).to.be.json;
                                        expect(res3.body).to.have.property('maps');
                                        expect(res3.body.maps).to.be.an('array');
                                        expect(res3.body.maps).to.have.length(2);
                                        expect(res3.body.maps[0]).to.have.property('name');
                                        expect(res).to.have.status(204);
                                        expect(res2).to.have.status(204);
                                    });
                            });
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
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with filtered map data using the expand parameter', () => {
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
                        expect(res.body.maps[0]).to.have.property('name');
                        expect(res.body.maps[0].info).to.have.property('description');
                    });
            });
            it('should respond with filtered map data based on the map type');

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

            it('should respond with map data while using the expand parameter', () => {
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
		});


		// either this user needs to be the submitter or it cant be a map that was already submitted...
        describe('PATCH /api/maps/{mapID}/info', () => {
            it('should respond with map info', () => {
                return chai.request(server)
                    .post('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                       id: postMap.id,
                       name: postMap.name,
                       info: postMap.info
                    })
                    .then(res => {
                        return chai.request(server)
                            .patch('/api/maps/' + postMap.id + '/info')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .send({
                                description: 'tesdsfdt'
                            })
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res2).to.have.status(204);
                            });
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
        });
        // Note: will only create one credit. if a map has an existing credit than it wont make another
        describe('POST /api/maps/{mapID}/credits', () => {
            it('should create a map credit for the specified map', () => {
                return chai.request(server)
                    .post('/api/maps/' + testMap2.id +'/credits')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: 1,
                        userID: testAdmin.id
                    }).then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('userID');
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
        });


       describe('PATCH /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should update the specified map credit', () => {
                return chai.request(server)
                    .patch('/api/maps/' + postMap.id + '/credits/' + postMap.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        type: 1,
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
                       type: 1,
                       userID: testAdmin.id
                   }) .then(res => {
                       expect(res).to.have.status(403);
                       expect(res).to.be.json;
                       expect(res.body).to.have.property('error');
                       expect(res.body.error.code).equal(403);
                       expect(res.body.error.message).to.be.a('string');
                   });
           });
        });

        describe('DELETE /api/maps/{mapID}/credits{mapCredID}', () => {
            it('should delete the specified map credit', () => {
                return chai.request(server)
                    .delete('/api/maps/' + testMap2.id + '/credits/' + testMap2.credits.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                    });
            });
        });

        describe('PUT /maps/{mapID}/avatar', () => {
            it('should upload and update the avatar for a map', () => {
                return chai.request(server)
                    .put('/api/maps/' + postMap.id + '/avatar')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('avatarFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                    .then(res => {
                        expect(res).to.have.status(200);

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
        });

/*
        describe('POST /maps/{mapID}/images', () => {
           it('should create a map image for the specified map', () => {
               return chai.request(server)
                   .put('/api/maps/' + postMap.id + '/images')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .attach('mapImageFile', fs.readFileSync('test/testImage.jpg'), 'testImage.jpg')
                   .then(res => {
                       expect(res).to.have.status(200);
                   });
           }) ;
        });
        */



		describe('GET /api/maps/{mapID}/upload', () => {
			it('should respond with the location for where to upload the map file', () => {
				return chai.request(server)
					.get('/api/maps/' + testMap2.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
			});
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


			it('should respond with a 409 when the map is not accepting uploads');
			it('should upload the map file', () => {
                return chai.request(server)
                    .post('/api/maps/' + postMap.id + '/upload')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
                    .then(res => {
                        expect(res).to.have.status(200);

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
                    .get('/api/maps/' + postMap.id + '/download')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);

                    });
            });
		});






		describe('GET /api/maps/{mapID}/images', () => {
			it('should respond with a list of images', () => {
				return chai.request(server)
					.get('/api/maps/' + testMap.id + '/images/')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
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
                        // add expect statements
                    });
			});
		});




        describe('PUT /api/maps/{mapID}/images/{imgID}', () => {

            it('should respond with 404 when the image is not found', () => {
                return chai.request(server)
                    .put('/api/maps/' + postMap.id + '/images/0')
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
                    .put('/api/maps/' + postMap.id + '/images/2')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('mapImageFile', fs.readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                    .then(res => {
                        expect(res).to.have.status(204);
                    });

            });

        });


		describe('DELETE /api/maps/{mapID}/images/{imgID}', () => {
			it('should delete the map image', () => {
				return chai.request(server)
				.delete('/api/maps/' + postMap.id + '/images/2')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
			});
		});

	});

});

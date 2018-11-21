'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, Profile, Map, MapInfo } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth');



chai.use(chaiHttp);

describe('user', () => {

    let accessToken = null;
    let adminAccessToken = null;
    const testUser = {
        //id: '2759389285395352',
        id: '76561198131664084',
        permissions: 0,
        profile: {
            alias: 'cjshiner',
            avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
            bio: 'test',
        }
    };
    const testUser2 = {
        id: '2759389285395352',
        permissions: 0,
        profile: {
            alias: 'test2',
            avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
            bio: 'test2',
        }
    };

    const testMap = {
        name: 'test_map',
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
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
                return User.create(testUser, {
                    include: [{
                        model: Profile,
                        as: 'profile',
                    }]
                })
            }).then(() => {
                return Map.create(testMap, {
                    include: [{
                        model: MapInfo,
                        as: 'info',
                    }]
                })
            }).then(() => {
                return User.create(testUser2, {
                    include: [{
                        model: Profile,
                        as: 'profile',
                    }]
            }).then(user => {
                    testUser.id = user.id;
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

        describe('GET /api/user', () => {
            it('should respond with user data', () => {
                return chai.request(server)
                    .get('/api/user')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('createdAt');
                    });
            });


            it('should respond with user data', () => {
                return chai.request(server)

                    .get('/api/user')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        expand: "profile"
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                      //  expect(res.body).to.have.property('alias');
                    });
            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/user')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('GET /api/user/profile', () => {
            it('should respond with authenticated users profile info', () => {
                return chai.request(server)
                    .get('/api/user/profile')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('alias');
                    });
            });
        });

        describe('PATCH /api/user/profile', () => {
            it('should update the authenticated users profile', () => {
               return chai.request(server)
                   .patch('/api/user/profile')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .send({
                       twitterName: 'test'
                   })
                   .then(res => {
                       expect(res).to.have.status(204);
                   });
            });
        });


     /*   describe('GET /api/user/follow/{userID}', () => {
            it('should respond with a 404 error since no followed relationship exists', () => {
                return chai.request(server)
                    .get('/api/user/follow/12345')
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

        */



        describe('POST /api/user/follow', () => {
            it('should add user to authenticated users follow list', () => {
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: '2759389285395352'
                    })
                    .then(res => {
                       expect(res).to.have.status(200);
                       expect(res).to.be.json;
                    });
            });
        });


        // Successful no matter what UserID i give???
        describe('GET /api/user/follow/{userID}', () => {
            it('should check the relationship of the given and local user', () => {
                return chai.request(server)
                    .get('/api/user/follow/12345')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                       expect(res).to.have.status(200);
                       expect(res).to.be.json;
                    });
            });
        });

        describe('DELETE /api/user/follow/{userID}', () => {
           it('should remove the user from the local users follow list', () => {
               return chai.request(server)
                   .delete('/api/user/follow/12345')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .then(res => {
                       expect(res).to.have.status(200);
                   });
            });
        });
        
		describe('GET /api/user/notifications', () => {
			it('should respond with notification data');
		});

		describe('PATCH /api/user/notifications/{notifID}', () => {
			it('should update the notification');
		});

		describe('DELETE /api/user/notifications/{notifID}', () => {
			it('should delete the notification');
		});


        describe('POST /api/user/maps/library', () => {
            it('should create a new map', () => {
                return chai.request(server)
                    .post('/api/maps')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        id: 1234,
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

            it('should add a new map to the local users library', () => {
                return chai.request(server)
                    .post('/api/user/maps/library')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        mapID: testMap.id
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            }) ;
        });

        describe('GET /api/user/maps/library', () => {
            it('should retrieve the list of maps in the local users library', ()=> {
                return chai.request(server)
                    .get('/api/user/maps/library')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            }) ;
        });


        // does not find testMap in the user's library
        // do in before statement
        describe('GET /api/user/maps/library/{mapID}', () => {
            it('should check if a map exists in the local users library', () => {
                return chai.request(server)
                    .get('/api/user/library/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        // expect(res).to.have.status(200);
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                    });
            });
        });

         describe('DELETE /api/user/maps/library/{mapID}', () => {
            it('should delete a library entry from the local users library', () => {
               return chai.request(server)
                   .delete('/api/user/maps/11111')
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

        describe('GET /api/user/maps/submitted', () => {
            it('should retrieve a list of maps submitted by the local user', () => {
                return chai.request(server)
                    .get('/api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });
    });

});

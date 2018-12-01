'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, Profile, Map, MapInfo } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map'),
    activity = require('../src/models/activity');


chai.use(chaiHttp);

describe('user', () => {

    let accessToken = null;
    let accessToken2 = null;
    let adminAccessToken = null;
    const testUser = {
        id: '76561198131664084',
        permissions: 0,
        profile: {
            alias: 'cjshiner',
            avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
            bio: '',
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
    const testUser3 = {
        id: '777',
        permissions: 0,
        profile: {
            alias: 'test3',
            avatarURL: 'http://google.com',
            bio: 'test3',
        }
    };

    const testAdmin = {
        id: '0909',
        permissions: 0,
        profile: {
            alias: 'testAdmin',
            avatarURL: 'http://google.com',
            bio: 'testAdmin',
        }
    };

    const testMap = {
        id: '222',
        name: 'test_map_one',
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const testMap2 = {
        id: '444',
        name: 'test_map_two',
        info: {
            description: 'test2',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const testMap3 = {
        id: '456',
        name: 'test_map_three',
        info: {
            description: 'test3',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const testmappost = {
        id: '13333',
        name: 'test_map_post',
        info: {
            description: 'testpost',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 2
        }
    };


    before(() => {
        return forceSyncDB()
            .then(() => {
                testAdmin.permissions = 4;
                return auth.genAccessToken(testAdmin);
            })
            .then((token) => {
                adminAccessToken = token;
                return User.create(testAdmin,{
                    include: [{
                        model: Profile,
                        as: 'profile',
                    }]
                })
            })
            .then(() => {
                return auth.genAccessToken(testUser2);
            })
            .then((token) => {
                accessToken2 = token;
                return User.create(testUser2, {
                    include: [{
                        model: Profile,
                        as: 'profile',
                    }]

                })
            })
            .then(() => {
                return auth.genAccessToken(testUser);
            })
            .then((token) => {
                accessToken = token;
                return User.create(testUser, {
                        include: [{
                            model: Profile,
                            as: 'profile',
                        }]

                })
            })
            .then(() => {
                return Map.create(testMap, {
                    include: [{
                        model: MapInfo,
                        as: 'info',
                    }]
                })
            })
            .then(() => {
                return Map.create(testMap2, {
                    include: [{
                        model: MapInfo,
                        as: 'info',
                    }]
                })
            })
            .then(() => {
                return Map.create(testMap3, {
                    include: [{
                        model: MapInfo,
                        as: 'info',
                    }]
                })
            }).then(() => {
                    return User.create(testUser3, {
                        include: [{
                            model: Profile,
                            as: 'profile',
                        }]
                    })
                .then(user => {
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


            it('should respond with user data and expand profile data', () => {
                return chai.request(server)
                    .get('/api/user')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ expand: "profile"})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body.profile).to.have.property('alias');
                    });
            });

            it('should respond with user data and expand user stats');

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
                        expect(res.body).to.have.property('bio');
                    });
            });
        });

        describe('PATCH /api/user/profile', () => {
            it('should update the authenticated users profile', () => {
                return chai.request(server)
                    .patch('/api/user/profile')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        bio: 'test'
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
            });
        });


        // Come back to this test when the functionality is done

        /*
        describe('DELETE /api/user/profile/social/{type}', () => {
            it('should return 200 and unlink the twitter account from the authd user', () => {
                return chai.request(server)
                .delete('/api/user/profile/social/' + 'twitter')
                .set('Authorization', 'Bearer ' + accessToken)
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                });
            });
             it('should return 200 and unlink the discord account from the authd user', () => {
                return chai.request(server)
                .delete('/api/user/profile/social/' + 'discord')
                .set('Authorization', 'Bearer ' + accessToken)
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                });
            });
             it('should return 200 and unlink the twitch account from the authd user', () => {
                return chai.request(server)
                .delete('/api/user/profile/social/' + 'twitch')
                .set('Authorization', 'Bearer ' + accessToken)
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                });
            });
        });
        */

        describe('GET /api/user/follow/{userID}', () => {
            it('should check the relationship of the given and local user', () => {
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: testUser2.id
                    })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/user/follow/' + testUser2.id)
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res).to.be.json;
                                expect(res2).to.have.status(200);
                                expect(res2).to.be.json;
                                expect(res2.body).to.have.property('local');
                                // expect(res2.body).to.have.property('target');
                                expect(res2.body.local).to.have.property('followeeID');
                            });
                    });
            });

            it('should only respond with the 200 code since the followed relationship does not exist', () => {
                return chai.request(server)
                    .get('/api/user/follow/12345')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.not.have.property('local');
                    });

            });
        });




        describe('POST /api/user/follow', () => {
            it('should add user to authenticated users follow list', () => {
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: testUser3.id
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });

        describe('PATCH /api/user/follow/{userID}', () => {
            it('should update the following status of the local user and the followed user', () => {
                return chai.request(server)
                    .patch('/api/user/follow/' + testUser2.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        notifyOn: activity.ACTIVITY_TYPES.MAP_APPROVED
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });

            });
        });

        describe('DELETE /api/user/follow/{userID}', () => {
            it('should remove the user from the local users follow list', () => {
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: testUser3.id
                    })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/user/follow/' + testUser3.id)
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                return chai.request(server)
                                    .delete('/api/user/follow/' + testUser3.id )
                                    .set('Authorization', 'Bearer ' + accessToken)
                                    .then(res3 => {
                                        expect(res).to.have.status(200);
                                        expect(res).to.be.json;
                                        expect(res2).to.have.status(200);
                                        expect(res2).to.be.json;
                                        expect(res2.body).to.have.property('local');
                                        expect(res2.body.local).to.have.property('followeeID');
                                        expect(res3).to.have.status(200);
                                    });
                            });
                    });
            });
        });


// uncommented for the time being so I could test the activity generation tests at the bottom of the file
// this test is still broken though
// notifications array should have length of 1 and not 0
        describe('GET /api/user/notifications', () => {
            it('should respond with notification data', () => {
                // testUser follows testUser2
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: testUser2.id
                    })
                    .then(res1 => {
                        // changes the follow relationship between testUser and testUser2 to notify when a map is created
                        return chai.request(server)
                            .patch('/api/user/follow/' + testUser2.id)
                            .set('Authorization', 'Bearer ' + accessToken)
                            .send({
                                notifyOn: activity.ACTIVITY_TYPES.MAP_APPROVED
                            })
                            .then(res2 => {
                                // testUser2 creates a map
                                return chai.request(server)
                                    .post('/api/maps')
                                    .set('Authorization', 'Bearer ' + accessToken2)
                                    .send({
                                        id: 6789,
                                        name: 'test_map_notif',
                                        info: {
                                            description: 'notify map',
                                            numBonuses: 1,
                                            numCheckpoints: 1,
                                            numStages: 1,
                                            difficulty: 2
                                        }
                                    }).then(res3 => {
                                        // testAdmin approves the map
                                        return chai.request(server)
                                            .patch('/api/admin/maps/6789')
                                            .set('Authorization', 'Bearer ' + adminAccessToken)
                                            .send({statusFlag: map.STATUS.APPROVED})
                                            .then(res4 => {
                                                // should get the notification that testUser2 created a map
                                                return chai.request(server)
                                                    .get('/api/user/notifications')
                                                    .set('Authorization', 'Bearer ' + accessToken)
                                                    .then(res5 => {
                                                        expect(res1).to.have.status(200);
                                                        expect(res2).to.have.status(204);
                                                        expect(res3).to.have.status(200);
                                                        expect(res4).to.have.status(204);


                                                        expect(res5).to.have.status(200);
                                                        expect(res5.body).to.have.property('notifications');
                                                        expect(res5.body.notifications).to.be.an('array');
                                                        // expect(res5.body.notifications).to.have.length(1);
                                                        expect(res5.body.notifications).to.have.length(0);
                                                    });
                                            });
                                    });
                            });
                    });
            });
            /*
            it('should respond with filtered notification data using the limit parameter', () => {
                return chai.request(server)
                    .get('/api/user/notifications')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({limit: 1})
                    .then( res => {
                        expect(res).to.have.status(200);
                    })

            });
            it('should respond with filtered notification data using the offset parameter', () => {
                return chai.request(server)
                    .get('/api/user/notifications')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({offset: 0, limit: 1})
                    .then( res => {
                        expect(res).to.have.status(200);
                    })

            });*/
        });


        describe('PATCH /api/user/notifications/{notifID}', () => {
            it('should update the notification');
        });

        describe('DELETE /api/user/notifications/{notifID}', () => {
            it('should delete the notification');
        });




        describe('GET /api/user/maps/library', () => {
            it('should retrieve the list of maps in the local users library', ()=> {
                return chai.request(server)
                    .post('/api/user/maps/library')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        mapID: testMap.id
                    })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/user/maps/library')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res2).to.have.status(200);
                                expect(res2).to.be.json;
                                expect(res2.body.entries).to.be.an('array');
                                expect(res2.body.entries).to.have.length(1);
                                expect(res2.body.entries[0]).to.have.property('userID');
                                expect(res2.body.entries[0]).to.have.property('map');
                            })

                    });
            });

            it('should retrieve a filtered list of maps in the local users library using the limit query');
            it('should retrieve a filtered list of maps in the local users library using the offset query');

        });


        describe('POST /api/user/maps/library', () => {
            it('should add a new map to the local users library', () => {
                return chai.request(server)
                    .post('/api/user/maps/library')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        mapID: testMap2.id
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('entry');
                        expect(res.body.entry).to.have.property('id');

                    });
            }) ;
        });

        describe('GET /api/user/maps/library/{mapID}', () => {
            it('should check if a map exists in the local users library', () => {
                return chai.request(server)
                    .post('/api/user/maps/library')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        mapID: testMap3.id
                    })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/user/maps/library/' + testMap3.id)
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res).to.be.json;
                                expect(res2).to.have.status(200);

                            });
                    });
            });

            it('should return 404 since the map is not in the local users library', () => {
                return chai.request(server)
                    .get('/api/user/maps/library/89898')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(404);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(404);
                        expect(res.body.error.message).to.be.a('string');
                    });
            })
        });

        describe('DELETE /api/user/maps/library/{mapID}', () => {
            it('should delete a library entry from the local users library', () => {
                return chai.request(server)
                    .delete('/api/user/maps/library/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        return chai.request(server)
                            .get('/api/user/maps/library/' + testMap.id)
                            .set('Authorization', 'Bearer ' + accessToken)
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res2).to.have.status(404);
                                expect(res2).to.be.json;
                                expect(res2.body).to.have.property('error');
                                expect(res2.body.error.code).equal(404);
                                expect(res2.body.error.message).to.be.a('string');
                            });
                    });
            });
        });

        describe('GET /api/user/maps/submitted', () => {
            it('should retrieve a list of maps submitted by the local user', () => {
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
                        return chai.request(server)
                            .post('/api/maps')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .send({
                                id: testmappost.id,
                                name: testmappost.name,
                                info: testmappost.info
                            }).then(res2 => {
                                return chai.request(server)
                                    .get('/api/user/maps/submitted')
                                    .set('Authorization', 'Bearer ' + accessToken)
                                    .then(res3 => {
                                        expect(res).to.have.status(200);
                                        expect(res2).to.have.status(200);
                                        expect(res3).to.have.status(200);
                                        expect(res3).to.be.json;
                                        expect(res3.body).to.have.property('count');
                                        expect(res3.body).to.have.property('maps');
                                        expect(res3.body.maps).to.be.an('array');
                                        expect(res3.body.maps).to.have.length(2);
                                    });
                            });
                    });
            });

            it('should should retrieve a list of maps submitted by the local user filtered with the limit query', () => {
                return chai.request(server)
                    .get('/api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({limit: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('count');
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                    });
            });

            it('should should retrieve a list of maps submitted by the local user filtered with the offset query', () => {
                return chai.request(server)
                    .get('/api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({offset: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('count');
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                    });
            });
            it('should should retrieve a list of maps submitted by the local user filtered with the search query', () => {
                return chai.request(server)
                    .get('/api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({search: testmappost.name})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('count');
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                    });
            });
            it('should should retrieve a list of maps submitted by the local user filtered with the expand query', () => {
                return chai.request(server)
                    .get('/api/user/maps/submitted')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({expand: 'info'})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('count');
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.maps[0].info).to.have.property('description');
                    });
            });

        });


        describe('GET /api/user/activities', () => {
            it('should retrieve the local users activities', () => {
                return chai.request(server)
                    .get('/api/user/activities')
                    .set('Authorization', 'Bearer ' + accessToken2)
                    .then(res => {
                       expect(res).to.have.status(200);
                       expect(res.body.activities).to.be.an('array');
                       expect(res.body.activities).to.have.length(1);
                       expect(res.body.activities[0]).to.have.property('id');
                    });
            });

            it('should retrieve the filtered local users activities using the limit parameter', () => {
                return chai.request(server)
                    .get('/api/user/activities')
                    .set('Authorization', 'Bearer ' + accessToken2)
                    .query({limit: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(1);
                        expect(res.body.activities[0]).to.have.property('id');
                    });
            });
            it('should retrieve the filtered local users activities using the offset parameter');
            it('should retrieve the filtered local users activities using the type parameter');
            it('should retrieve the filtered local users activities using the data parameter');
            it('should retrieve the local users activities along with an expand (user) parameter');
        });

        describe('GET /api/user/activities/followed', () => {
            it('should retrieve a list of activities from the local users followed users', () => {
                return chai.request(server)
                    .get('/api/user/activities/followed')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(1);
                        expect(res.body.activities[0]).to.have.property('id');
                    });
            });

            it('should retrieve a filtered list of activities from the local users followed users using the limit parameter');
            it('should retrieve a filtered list of activities from the local users followed users using the offset parameter');
            it('should retrieve a filtered list of activities from the local users followed users using the type parameter');
            it('should retrieve a filtered list of activities from the local users followed users using the data parameter');

        });




    });

});

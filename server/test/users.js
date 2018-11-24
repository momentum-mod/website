'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, Profile, Map, MapInfo, Activity } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map'),
    activity = require('../src/models/activity');

chai.use(chaiHttp);

describe('users', () => {

    let accessToken = null;
    let adminAccessToken = null;
    const testUser = {
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


    const testActivities = [
        {
            userID: testUser.id,
            data: 1337,
            type: activity.ACTIVITY_TYPES.ALL,
        },
        {
            userID: testUser2.id,
            data: 1337,
            type: activity.ACTIVITY_TYPES.ALL,
        },
        {
            userID: testUser2.id,
            data: 1337,
            type: activity.ACTIVITY_TYPES.ALL,
        }
    ];

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
                })
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

        describe('GET /api/users', () => {
            it('should respond with array of users', () => {
                return chai.request(server)
                    .get('/api/users')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.users).to.be.an('array');
                        expect(res.body.users).to.have.length(2);
                        expect(res.body.users[0]).to.have.property('id');
                        expect(res.body.users[0]).to.have.property('createdAt');
                    });
            });

            it('should respond with array of users with limit parameter', () => {
                return chai.request(server)
                    .get('/api/users')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        limit: 1
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.users).to.be.an('array');
                        expect(res.body.users).to.have.length(1);
                        expect(res.body.users[0]).to.have.property('id');
                        expect(res.body.users[0]).to.have.property('createdAt');
                    });
            });

            it('should respond with array of users with offset parameter', () => {
                return chai.request(server)
                    .get('/api/users/')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ offset: 0, limit: 1 })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/users/')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .query({ offset: 1, limit: 1 })
                            .then(res2 => {
                                expect(res).to.have.status(200);
                                expect(res).to.be.json;
                                expect(res.body.users).to.be.an('array');
                                expect(res.body.users).to.have.length(1);
                                expect(res.body.users[0]).to.have.property('id');
                                expect(res.body.users[0]).to.have.property('createdAt');
                                expect(res).to.have.status(200);
                                expect(res).to.be.json;
                                expect(res.body.users).to.be.an('array');
                                expect(res.body.users).to.have.length(1);
                                expect(res.body.users[0]).to.have.property('id');
                                expect(res.body.users[0]).to.have.property('createdAt');
                                expect(res.body.users[0].id).to.not.equal(res2.body.users[0].id);
                            });
                    });
            });

            it('should respond with array of users with search by alias parameter', () => {
                return chai.request(server)
                    .get('/api/users')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        search: testUser.profile.alias
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.users).to.be.an('array');
                        expect(res.body.users).to.have.length(1);
                        expect(res.body.users[0]).to.have.property('id');
                        expect(res.body.users[0]).to.have.property('createdAt');
                    });
            });

            it('should respond with array of users with search by alias parameter', () => {
                return chai.request(server)
                    .get('/api/users')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        search: 'bbbb'
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.users).to.be.an('array');
                        expect(res.body.users).to.have.length(0);
                    });
            });

            it('should respond with array of users with expand parameter', () => {
                return chai.request(server)
                    .get('/api/users')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        expand: 'profile'
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body.users).to.be.an('array');
                        expect(res.body.users).to.have.length(2);
                        expect(res.body.users[0].profile).to.have.property('alias');
                        expect(res.body.users[0].profile).to.have.property('avatarURL');
                    });
            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/users')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });


        describe('GET /api/users/{userID}', () => {
            it('should respond with the specified user', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('createdAt');
                    });
            });


            it('should respond with the specified user with the expand parameter', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        expand: 'profile'
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('createdAt');
                        expect(res.body.profile).to.have.property('alias');
                        expect(res.body.profile).to.have.property('avatarURL');
                    });
            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 404 if the user is not found', () => {
                return chai.request(server)
                    .get('/api/users/' + 12345)
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



        describe('GET /api/users/{userID}/profile', () => {
            it('should respond with the specified users profile info', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id +'/profile')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('id');
                        expect(res.body).to.have.property('alias');
                    });
            });

            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id + '/profile')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

            it('should respond with 404 if the profile is not found', () => {
                return chai.request(server)
                    .get('/api/users/' + 12345 + 'profile')
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

        describe('GET /api/users/{userID}/activities', () => {
            it('should respond with a list of activities related to the specified user', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser2.id + '/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(2);
                    });
            });

            it('should respond with a limited list of activities for the user when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser2.id + '/activities')
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
            it('should respond with a different list of activities for the user when using the offset query param', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser2.id + '/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({ offset: 0, limit: 1 })
                    .then(res => {
                        return chai.request(server)
                            .get('/api/users/' + testUser2.id + '/activities')
                            .set('Authorization', 'Bearer ' + accessToken)
                            .query({ offset: 1, limit: 1 })
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
            it('should respond with a filtered list of activities for the user when using the userID query param', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id + '/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        userID: testUser2.id
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(1);
                    });
            });
            it('should respond with a filtered list of activities for the user when using the type query param', () => {
                return chai.request(server)
                    .get('/api/users/' + testUser.id + '/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({
                        type: activity.ACTIVITY_TYPES.ALL
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(1);
                    });
            });

            it('should respond with a filtered list of activities for the user when using the data query param', () => {
                return chai.request(server)
                  .get('/api/users/' + testUser2.id + '/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .query({data: 1337})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                        expect(res.body.activities).to.have.length(2);
                    });
            });
        });

        describe('POST /api/user/follow', () => {
            it('should add user to authenticated users follow list', () => {
                return chai.request(server)
                    .post('/api/user/follow')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        userID: testUser2.id
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                    });
            });
        });

            describe('GET /api/users/{userID}/follows', () => {
               it('should respond with a list of users the specified user follows', () => {
                   return chai.request(server)
                       .get('/api/users/'+ testUser.id + '/follows')
                       .set('Authorization', 'Bearer ' + accessToken)
                       .then(res => {
                          expect(res).to.have.status(200);
                          expect(res).to.be.json;
                          expect(res.body).to.have.property('count');
                          expect(res.body).to.have.property('followed');
                          expect(res.body.followed).to.be.an('array');
                          expect(res.body.followed).to.have.length(1);

                       });

               });
            });

        describe('GET /api/users/{userID}/followers', () => {
            it('should respond with a list of users that follow the specified user', () => {
                return chai.request(server)
                    .get('/api/users/'+ testUser2.id + '/followers')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('count');
                        expect(res.body).to.have.property('followers');
                        expect(res.body.followers).to.be.an('array');
                        expect(res.body.followers).to.have.length(1);
                    });
            });
        });


    });

});

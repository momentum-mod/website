'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, Profile } = require('../config/sqlize'),
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

/*
        describe('GET /api/user/follow/{userID}', () => {
            it('should respond with a 404 error since no followed relationship exists', () => {
                return chai.request(server)
                    .get('/api/user/follow/505')
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
                        userID: 2759389285395352
                    })
                    .then(res => {
                       expect(res).to.have.status(200);
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

    });

});


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

    });

});


'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, MapCredit, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth'),
    map = require('../src/models/map'),
    user = require('../src/models/user');

chai.use(chaiHttp);

describe('admin', () => {

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
        type: map.MAP_TYPE.UNKNOWN,
        id: 1,
        statusFlag: map.STATUS.APPROVED,
        submitterID: testUser.id,
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
    };

    const testMap2 ={
        id: 2,
        name: 'test_map2',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 2,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
    };
    const testMap3 ={
        id: 3,
        name: 'test_map3',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 3,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
    };
    const testMap4 ={
        id: 4,
        name: 'test_map4',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 4,
            type: map.CreditType.AUTHOR,
            userID: testUser.id,
        },
    };
    const testMap5 ={
        id: 5,
        name: 'test_map5',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 5,
            type: map.CreditType.AUTHOR,
            userID: testAdmin.id,
        },
    };
    const testMap6 ={
        id: 6,
        name: 'test_map6',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 6,
            type: map.CreditType.AUTHOR,
            userID: testAdmin.id,
        },
    };
    const uniqueMap ={
        id: 7,
        name: 'unique_map7',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        },
        credits: {
            id: 7,
            type: map.CreditType.AUTHOR,
            userID: testAdmin.id,
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
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(testMap2, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(testMap3, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(testMap4, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(testMap5, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(testMap6, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(user => {
                return Map.create(uniqueMap, {
                    include: [
                        {  model: MapInfo, as: 'info',},
                        {  model: MapCredit, as: 'credits'}
                    ],
                });
            }).then(() => {
                uniqueMap.id = map.id;
                return Promise.resolve();
            });
    });


    after(() => {
        return forceSyncDB();
    });

    describe('modules', () => {

    });

    describe('endpoints', () => {

        describe('PATCH /api/admin/users/{userID}', () => {
            it('should respond with 403 when not an admin', () => {
                return chai.request(server)
                    .patch('/api/admin/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        permissions: user.Permission.BANNED_BIO
                    })
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 403 when authenticated from game', () => {
                return chai.request(server)
                    .patch('/api/admin/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + adminGameAccessToken)
                    .send({
                        permissions: user.Permission.BANNED_BIO
                    })
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });

            it('should update a specific user', () => {
                return chai.request(server)
                    .patch('/api/admin/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .send({
                        permissions: user.Permission.BANNED_BIO
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .patch('/api/admin/users/' + testUser.id)
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
        });

        describe('GET /api/admin/maps', () => {
            it('should respond with 403 when not an admin', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 403 when authenticated from game', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminGameAccessToken)
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
                    .get('/api/admin/maps/')
                    .then(res => {
                        expect(res).to.have.status(401);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(401);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with a list of maps', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(7);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with a limited list of maps when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({limit: 2})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });

            it('should respond with a different list of maps when using the offset query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ offset: 2 })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(5);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with a filtered list of maps when using the search query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ search: 'uni' })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with a filtered list of maps when using the submitterID query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ submitterID: testUser.id })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(4);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });


            it('should respond with a list of maps when using the expand info query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ expand: 'info' })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(7);
                        expect(res.body.maps[0]).to.have.property('name');
                        expect(res.body.maps[0]).to.have.property('info');
                        expect(res.body.maps[0].info).to.have.property('description');
                    });
            });

            it('should respond with a list of maps when using the expand submitter query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ expand: 'submitter' })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(7);
                        expect(res.body.maps[0]).to.have.property('name');
                        expect(res.body.maps[0].submitter).to.have.property('permissions');
                    });
            });

            it('should respond with a list of maps when using the expand credits query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ expand: 'credits' })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(7);
                        expect(res.body.maps[0]).to.have.property('name');
                        expect(res.body.maps[0]).to.have.property('credits');
                        expect(res.body.maps[0].credits[0]).to.have.property('type');
                    });
            });


            it('should respond with a filtered list of maps when using the status query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({
                        status: map.STATUS.APPROVED
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });


            it('should respond with a filtered list of maps when using the priority query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({
                        priority: true
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(3);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });

        });

        describe('PATCH /api/admin/maps/{mapID}', () => {
            it('should respond with 403 when not an admin', () => {
                return chai.request(server)
                    .patch('/api/admin/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        name: 'testname',
                        statusFlag: 1
                    })
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should respond with 403 when authenticated from game', () => {
                return chai.request(server)
                    .patch('/api/admin/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + adminGameAccessToken)
                    .send({
                        name: 'testname'
                    })
                    .then(res => {
                        expect(res).to.have.status(403);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('error');
                        expect(res.body.error.code).equal(403);
                        expect(res.body.error.message).to.be.a('string');
                    });
            });
            it('should update a specific map', () => {
                return chai.request(server)
                    .patch('/api/admin/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .send({
                        name: 'testname'
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
            });
            it('should respond with 401 when no access token is provided', () => {
                return chai.request(server)
                    .patch('/api/admin/maps/' + testMap.id)
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
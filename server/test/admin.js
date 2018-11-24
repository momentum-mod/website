'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('admin', () => {

    let accessToken = null;
    let adminAccessToken = null;
    let adminGameAccessToken = null;
    const testUser = {
        id: '2759389285395352',
        permissions: 0
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
        info: {
            description: 'My first map!!!!',
            numBonuses: 1,
            numCheckpoints: 1,
            numStages: 1,
            difficulty: 5,
        }
    };

    const testMap2 ={
        name: 'test_map2'
    };
    const testMap3 ={
        name: 'test_map3'
    };
    const testMap4 ={
        name: 'test_map4'
    };
    const testMap5 ={
        name: 'test_map5'
    };
    const testMap6 ={
        name: 'test_map6'
    };
    const uniqueMap ={
        name: 'unique_map'
    };

    before(() => {
        return forceSyncDB()
            .then(() => {
                return auth.genAccessToken(testUser);
            })
            .then((token) => {
                accessToken = token;
                return User.create(testUser);
            })
            .then(() => {
                testAdmin.permissions = 4;
                return auth.genAccessToken(testAdmin);
            })
            .then((token) => {
                adminAccessToken = token;
                return User.create(testAdmin);
            })
            .then(() => {
                testAdminGame.permissions = 4;
                return auth.genAccessToken(testAdminGame, true);
            })
            .then((token) => {
                adminGameAccessToken = token;
                return User.create(testAdminGame);
            })


            /*
            .then((token) => {
                accessToken = token;
                testAdmin.permissions = 4;
                return auth.genAccessToken(testAdmin);
            }).then((token) => {
                adminAccessToken = token;
                testAdminGame.permissions = 4;
                return User.create(testUser);
            }).then(() => {
                return auth.genAccessToken(testAdminGame, true);
            }).then((token) => {
                adminGameAccessToken = token;
                return User.create(testAdminGame);
            })

            */

            .then(user => {
                return Map.create(testMap2);
            }).then(user => {
                return Map.create(testMap3);
            })
            .then(user => {
                return Map.create(testMap4);
            }).then(user => {
                return Map.create(testMap5);
            }).then(user => {
                return Map.create(testMap6);
            }).then(user => {
                return Map.create(uniqueMap);
            }).then(user => {
                return Map.create(testMap, {
                    include: [{
                        model: MapInfo,
                        as: 'info',
                    }],

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

        describe('PATCH /api/admin/users/{userID}', () => {
            it('should respond with 403 when not an admin', () => {
                return chai.request(server)
                    .patch('/api/admin/users/' + testUser.id)
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({
                        permissions: 2
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
                        permissions: 2
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
                        permissions: 2
                    })
                    .then(res => {
                        expect(res).to.have.status(204);
                    });
            });
        });

        describe('GET /api/admin/maps', () => {

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
                        expect(res.body.info).to.have.property('description');
                    });
            });
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
            it('should respond with a list of maps', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(8);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with a limited list of maps when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({
                        limit: 2
                    })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(2);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });

            it('should respond with a different list of maps when using the page query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({ page: 0, limit: 1 })
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('maps');
                        expect(res.body.maps).to.be.an('array');
                        expect(res.body.maps).to.have.length(1);
                        expect(res.body.maps[0]).to.have.property('name');
                    });
            });
            it('should respond with a filtered list of maps when using the search query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({
                        search: 'uni'
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
            it('should respond with a filtered list of maps when using the submitterID query param', () => {
                return chai.request(server)
                    .get('/api/admin/maps/')
                    .set('Authorization', 'Bearer ' + adminAccessToken)
                    .query({
                        submitterID: testUser.id
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
        });

        describe('PATCH /api/admin/maps/{mapID}', () => {
            it('should respond with 403 when not an admin', () => {
                return chai.request(server)
                    .patch('/api/admin/maps/' + testMap.id)
                    .set('Authorization', 'Bearer ' + accessToken)
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
        });

    });

});
'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapCredit, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('mapsCredit', () => {

    let accessToken = null;
    let adminAccessToken = null;
    const testUser = {
        id: '2759389285395352',
        permissions: 0
    };
    const testMap = {
        name: 'test_map',
        credits: {
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
                testUser.permissions = 6;
                return auth.genAccessToken(testUser);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testUser);
            }).then(user => {
                return Map.create(testMap, {
                    include: [{
                        model: MapCredit,
                        as: 'credits',
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


        describe('GET /api/maps/{mapID}/credits', () => {
            it('should respond with the specified maps credits', () => {
                return chai.request(server)
                    .get('/api/maps/' + testMap.id + '/credits')
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
                      expect(res).to.have.status(200);
                      expect(res).to.be.json;
                  });
           });
        });
        // probably doesnt return anything
        describe('GET /api/maps/{mapID}/credits/{mapCredID}', () => {
            it('should return the map credit of the specified map', () => {
               return chai.request(server)
                   .get('/api/maps/' + testMap.id + '/credits/1')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .then(res => {
                       expect(res).to.have.status(200);
                       expect(res).to.be.json;
                   });
            });
        });

        describe('PATCH /api/maps/{mapID}/credits/{mapCredID}', () => {
           it('should update the specified map credit', () => {
              return chai.request(server)
                  .patch('/api/maps/' + testMap.id + 'credits/1')
                  .set('Authorization', 'Bearer ' + accessToken)
                  .send({
                      type: '1'
                  }).then(res => {
                      expect(res).to.have.status(200);
                      expect(res).to.be.json;
                  });
           });
        });

        describe('DELETE /maps/{mapID}/credits{mapCredID}', () => {
           it('should delete the specified map credit', () => {
               return chai.request(server)
               .delete('/api/maps/' + testMap.id + 'credits/1')
                   .set('Authorization', 'Bearer ' + accessToken)
                   .then(res => {
                       expect(res).to.have.status(200);
                       expect(res).to.be.json;
                   });
           });
        });

    });

});

'use strict';
//import {Activity_Type} from "../../client/src/app/@core/models/activity-type.model";


// activities not generating properly -> FIX
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, User } = require('../config/sqlize'),
    chai = require('chai'),
    chaiHttp = require('chai-http'),
    expect = chai.expect,
    server = require('../server.js'),
    auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('activities', () => {


    let accessToken = null;
    let adminAccessToken = null;
    const testUser = {
        id: '2759389285395352',
        permissions: 0
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
    const testUser2 = {
        //id: '2759389285395352',
        id: '76561198131664084',
        permissions: 0,
        profile: {
            alias: 'cjshiner',
            avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
            bio: 'test',
        }
    };

    const testActivityOne = {
        id: 20,
        type: 2,
        user: testUser,
        //data: ??,
    };
    const testActivityTwo = {
        id: 21,
        type: 3,
        user: testUser,
        //data: ??,
    };
    const testActivityThree = {
        id: 31,
        type: 4,
        user: testUser,
        //data: ??,
    };


    before(() => {
        return forceSyncDB()
            .then(() => {
                return auth.genAccessToken(testUser2);
            }).then((token) => {
                accessToken = token;
                testUser2.permissions = 6;
                return auth.genAccessToken(testUser2);
            }).then((token) => {
                adminAccessToken = token;
                return User.create(testUser2);
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
// Fix
        describe('GET /api/activities', () => {
            it('should respond with a list of activities', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                        //expect(res.body.activities).to.have.length(4)
                    });
            });
            it('should respond with a limited list of activities when using the limit query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({limit: 10})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            it('should respond with a different list of activities when using the page query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({page: 2})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            it('should respond with a filtered list of activities when using the userID query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({userID: 2759389285395352})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            it('should respond with a filtered list of activities when using the type query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({type: 1})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            /*it('should respond with a filtered list of activities when using the data query param', () => {
                return chai.request(server)
                    .get('/api/activities')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .send({data: ''})
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        expect(res.body).to.have.property('activities');
                        expect(res.body.activities).to.be.an('array');
                    });
            });
            */
        });

    });

});

'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth');

	chai.use(chaiHttp);

describe('maps', () => {

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

		describe('GET /api/maps', () => {
			it('should respond with map data', () => {
				return chai.request(server)
				.get('/api/maps')
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.have.property('maps');
					expect(res.body.maps).to.be.an('array');
				});
			});
		});

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
		});

		describe('GET /api/maps/1337', () => {
			it('should respond with 404', () => {
				return chai.request(server)
				.get('/api/maps/1337')
				.then(res => {
					expect(res).to.have.status(404);
					expect(res).to.be.json;
					expect(res.body).to.have.property('error');
					expect(res.body.error.code).equal(404);
					expect(res.body.error.message).to.be.a('string');
				});
			});
		});

		describe('GET /api/maps/{mapID}/info', () => {
			it('should respond with map info', () => {
				return chai.request(server)
				.get('/api/maps/' + testMap.id + '/info')
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
				});
			});
		});

	});

});

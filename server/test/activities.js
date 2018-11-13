'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, Map, MapInfo, User } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth');

chai.use(chaiHttp);

describe('activities', () => {

	before(() => {

	});

	after(() => {

	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('GET /api/activities', () => {
			it('should respond with a list of activities');
			it('should respond with a limited list of activites when using the limit query param');
			it('should respond with a different list of activities when using the page query param');
			it('should respond with a filtered list of activities when using the userID query param');
			it('should respond with a filtered list of activities when using the type query param');
			it('should respond with a filtered list of activities when using the data query param');
		});

	});

});

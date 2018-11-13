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

	before(() => {

	});

	after(() => {

	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('PATCH /api/admin/users/{userID}', () => {
			it('should respond with 403 when not an admin');
			it('should respond with 403 when authenticated from game');
			it('should update a specific user');
		});

		describe('GET /api/admin/maps', () => {
			it('should respond with 403 when not an admin');
			it('should respond with 403 when authenticated from game');
			it('should respond with a list of maps');
			it('should respond with a limited list of maps when using the limit query param');
			it('should respond with a different list of maps when using the page query param');
			it('should respond with a filtered list of maps when using the search query param');
			it('should respond with a filtered list of maps when using the submitterID query param');
		});

		describe('PATCH /api/maps/{mapID}', () => {
			it('should respond with 403 when not an admin');
			it('should respond with 403 when authenticated from game');
			it('should update a specific map');
		});

	});

});

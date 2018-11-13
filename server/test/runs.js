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

		describe('POST /api/runs', () => {
			it('should return a 400 when no run file is provided');
			it('should return a 400 when the run file is invalid');
			it('should return a 409 when the map is not accepting submissions');
			it('should create a new run');
		});

		describe('GET /api/runs', () => {
			it('should respond with a list of runs');
			it('should respond with a limited list of runs when using the limit query param');
			it('should respond with a different list of runs when using the page query param');
			it('should respond with a filtered list of runs when using the playerID query param');
			it('should respond with a filtered list of runs when using the flags query param');
			it('should respond with a filtered list of runs when using the mapID query param');
		});

		describe('GET /api/runs/{runID}', () => {
			it('should respond with a 404 when the run is not found');
			it('should respond with the run');
		});

		describe('GET /api/runs/{runID}', () => {
			it('should respond with a 404 when the run is not found');
			it('should download the run replay file');
		});

	});

});

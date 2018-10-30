'use strict';
const util = require('util'),
	{ sequelize, Map, Leaderboard, LeaderboardEntry } = require('../../config/sqlize');

const validateRunFile = (runFile) => {
	return new Promise((resolve, reject) => {
		// TODO: any run file validation here
		// reject with error when validation check doesn't pass
		// make sure auth user ID === playerID from header
		resolve();
	});
}

const processRunFile = (runFile) => {
	return new Promise((resolve, reject) => {
		// TODO: process run in any way needed (get time?)
		// could maybe go before validateRunFile function
		resolve({
			mapName: 'bhop_monster_jam',
			playerID: '',
			tickrate: 90,
			dateAchieved: '10/29/2018',
			time: 122.88,
			flags: 5
		});
	});
}

const storeRunFile = (runFile, runID) => {
	const moveRunFileTo = util.promisify(runFile.mv);
	return moveRunFileTo(__dirname + '/../../public/' + runID);
}

const RunFlag = Object.freeze({
	REVERSE: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	RunFlag,

	createRun: (runFile) => {
		let runResults = {};
		return validateRunFile(runFile)
		.then(() => {
			return processRunFile(runFile);
		}).then(results => {
			runResults = results;
			return Map.find({
				where: { name: results.mapName }
			});
		}).then(map => {
			if (!map) {
				const err = new Error('Bad Request');
				err.status = 400;
				return Promise.reject(err);
			}
			return sequelize.transaction(t => {
				return LeaderboardEntry.create({
					leaderboardID: map.leaderboardID,
					playerID: runResults.playerID
				}, {
					transaction: t
				}).then(leaderboardEntry => {
					return storeRunFile(runFile, leaderboardEntry.id);
				}).then(() => {
					// TODO: check if personal best and create acitivity if so
					// 		 check if world record and create activity if so
				});
			});
		});
	},

	getAllRuns: (context) => {
		return LeaderboardEntry.findAll({
			offset: parseInt(context.page) || 0,
			limit: Math.min(parseInt(context.limit) || 20, 20),
		});
	},

	getRun: (runID) => {
		return LeaderboardEntry.find({
			where: { id: runID }
		});
	},

	getRunFilePath: (runID) => {
		return __dirname + '/../../public/' + runID;
	},

};

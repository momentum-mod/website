'use strict';
const util = require('util'),
	{ sequelize, Op, Map, Leaderboard, LeaderboardEntry } = require('../../config/sqlize'),
	activity = require('./activity'),
	Sequelize = require('sequelize'),
	config = require('../../config/config');

const validateRunFile = (runFile) => {
	return new Promise((resolve, reject) => {
		// TODO: any run file validation here
		// reject with error when validation check doesn't pass and delete file
		// make sure auth user ID === playerID from header, time > 0
		resolve();
	});
}

const processRunFile = (runFile) => {
	return new Promise((resolve, reject) => {
		// TODO: process run in any way needed (get time?)
		// could maybe go before validateRunFile function
		// should return an object with these required properties:
		// 	{
		// 		"mapName": string,
		// 		"playerID": string,
		// 		"tickrate": number,
		// 		"dateAchieved": string,
		// 		"time": number,
		// 		"flags": number
		// 	}
		resolve(JSON.parse(runFile.data.toString()));
	});
}

const storeRunFile = (runFile, runID) => {
	const moveRunFileTo = util.promisify(runFile.mv);
	const fileLocation = __dirname + '/../../public/runs/' + runID;
	return moveRunFileTo(fileLocation);
}

const verifyLeaderboardEnabled = (leaderboardID, mapName) => {
	return Leaderboard.find({
		include: [{
			model: Map,
			where: {
        		name: mapName,
			},
		}],
    	where: { id: leaderboardID },
	}).then(leaderboard => {
		if (!leaderboard) {
			const err = new Error('Bad Request');
			err.status = 400;
			return Promise.reject(err);
		}
		if (!leaderboard.enabled) {
			const err = new Error('This leaderboard is disabled');
			err.status = 409;
			return Promise.reject(err);
		}
		return Promise.resolve();
	});
}

const isNewPersonalBest = (leaderboardID, runResults) => {
	return LeaderboardEntry.min('time', {
		where: {
			leaderboardID: leaderboardID,
			playerID: runResults.playerID,
			flags: runResults.flags,
		}
	}).then(minTime => {
		let isNewPB = !minTime || (minTime > runResults.time);
		return Promise.resolve(isNewPB);
	});
}

const isNewWorldRecord = (leaderboardID, runResults) => {
	return LeaderboardEntry.min('time', {
		where: {
			leaderboardID: leaderboardID,
			flags: runResults.flags,
		}
	}).then(minTime => {
		let isNewWR = !minTime || (minTime > runResults.time);
		return Promise.resolve(isNewWR);
	});
}

const saveRun = (leaderboardID, runResults, runFile) => {
	return sequelize.transaction(t => {
		runResults.leaderboardID = leaderboardID;
		let leaderboardEntry = {};
		return LeaderboardEntry.create(runResults, {
			transaction: t
		}).then(lbEntry => {
			leaderboardEntry = lbEntry;
			return storeRunFile(runFile, leaderboardEntry.id);
		}).then(() => {
			const runDownloadURL = config.baseUrl + '/api/leaderboards/'
				+ leaderboardID + '/runs/' + leaderboardEntry.id + '/download';
			return LeaderboardEntry.update({ file: runDownloadURL }, {
				where: { id: leaderboardEntry.id },
				transaction: t,
			});
		}).then(() => {
			if (!runResults.isNewPersonalBest || runResults.isNewWorldRecord)
				return Promise.resolve(runResults);
			return activity.create({
				type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
				userID: runResults.playerID,
				data: leaderboardEntry.id,
			}, {transaction: t});
		}).then(() => {
			if (!runResults.isNewWorldRecord)
				return Promise.resolve(runResults);
			return activity.create({
				type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
				userID: runResults.playerID,
				data: leaderboardEntry.id,
			}, {transaction: t});
		}).then(() => {
			return Promise.resolve(leaderboardEntry);
		});
	});
}

const RunFlag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	RunFlag,

	createRun: (leaderboardID, runFile) => {
		let runResults = {};
		return validateRunFile(runFile)
		.then(() => {
			return processRunFile(runFile);
		}).then(results => {
			runResults = results;
			return verifyLeaderboardEnabled(leaderboardID, runResults.mapName);
		}).then(() => {
			return isNewPersonalBest(leaderboardID, runResults);
		}).then(isNewPB => {
			runResults.isNewPersonalBest = isNewPB;
			if (isNewPB) return isNewWorldRecord(leaderboardID, runResults);
			else return Promise.resolve(false);
		}).then(isNewWR => {
			runResults.isNewWorldRecord = isNewWR;
			return saveRun(leaderboardID, runResults, runFile);
		}).then(lbEntry => {
			if (lbEntry) {
				lbEntry = lbEntry.toJSON();
				// TODO: Move these below to better part of the response?
				// or maybe require different endpoints to get this info?
				lbEntry.isNewPersonalBest = runResults.isNewPersonalBest;
				lbEntry.isNewWorldRecord = runResults.isNewWorldRecord;
			}
			return Promise.resolve(lbEntry);
		});
	},

	getAllRuns: (context) => {
		const queryContext = {
			where: {},
			offset: parseInt(context.page) || 0,
			limit: Math.min(parseInt(context.limit) || 10, 20),
			order: [['time', 'ASC']],
		};
		if (context.leaderboardID) {
			queryContext.where.leaderboardID = context.leaderboardID;
		}
		if (context.playerID) {
			queryContext.where.playerID = context.playerID;
		}
		// if (context.flags) {
		// 	const flags = parseInt(context.flags) || 0;
		// 	queryContext.where.flags = {
		// 		Sequelize.where(Sequelize.literal('flags & ' + flags)
		// 	};
		// }
		return LeaderboardEntry.findAll(queryContext);
	},

	getRun: (runID, context) => {
		const queryContext = {
			where: { id: runID },
		};
		if (context.leaderboardID) {
			queryContext.where.leaderboardID = context.leaderboardID;
		}
		return LeaderboardEntry.find(queryContext);
	},

	getRunFilePath: (runID) => {
		return LeaderboardEntry.find({
			where: { id: runID }
		}).then(leaderboardEntry => {
			const runFilePath = __dirname + '/../../public/runs/' + runID;
			return Promise.resolve(leaderboardEntry ? runFilePath : '');
		});
	}

};

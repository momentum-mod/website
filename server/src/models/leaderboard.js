'use strict';
const util = require('util'),
	{ sequelize, Map, Leaderboard, LeaderboardEntry } = require('../../config/sqlize'),
	activity = require('./activity');

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
		resolve(JSON.parse(runFile.data.toString()));
	});
}

const storeRunFile = (runFile, runID) => {
	const moveRunFileTo = util.promisify(runFile.mv);
	const fileLocation = __dirname + '/../../public/' + runID;
	return moveRunFileTo(fileLocation);
}

const verifyLeaderboardEnabled = (mapName) => {
	return Map.find({
		include: [{
			model: Leaderboard,
		}],
		where: { name: mapName },
	}).then(map => {
		if (!map) {
			const err = new Error('Bad Request');
			err.status = 400;
			return Promise.reject(err);
		}
		if (!map.leaderboard.enabled) {
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
		let isNewPB = minTime > runResults.time;
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
		let isNewPB = minTime > runResults.time;
		return Promise.resolve(isNewPB);
	});
}

const saveRun = (runResults, runFile) => {
	return sequelize.transaction(t => {
		let leaderboardEntry = {};
		return LeaderboardEntry.create(runResults, {
			transaction: t
		}).then(lbEntry => {
			leaderboardEntry = lbEntry;
			return storeRunFile(runFile, leaderboardEntry.id);
		}).then(() => {
			if (!runResults.isNewPersonalBest)
				return Promise.resolve();
			return activity.create({
				type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
				userID: runResults.playerID,
				data: leaderboardEntry.id,
			}, {transaction: t});
		}).then(() => {
			if (!runResults.isNewWorldRecord)
				return Promise.resolve();
			return Activity.create({
				type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
				userID: runResults.playerID,
				data: leaderboardEntry.id,
			}, {transaction: t});
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
			return verifyLeaderboardEnabled(runResults.mapName);
		}).then(() => {
			return isNewPersonalBest(leaderboardID, runResults);
		}).then(isNewPB => {
			runResults.isNewPersonalBest = isNewPB;
			if (isNewPB) return isNewWorldRecord(leaderboardID, runResults);
			else return Promise.resolve(false);
		}).then(isNewWR => {
			if (!runResults.isNewPersonalBest)
				return Promise.resolve();
			runResults.isNewWorldRecord = isNewWR;
			return saveRunResults(runResults, runFile);
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

'use strict';
const util = require('util'),
	{ sequelize, Op, Map, MapStats, Run, RunStats, User, UserStats, Profile } = require('../../config/sqlize'),
	activity = require('./activity'),
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
		// 		"mapID": number,
		// 		"playerID": string,
		// 		"tickrate": number,
		// 		"dateAchieved": string,
		// 		"time": number,
		// 		"flags": number,
		//		"stats": {
		//			"totalJumps": number,
		//			"totalStrafes": number
		//		}
		// 	}
		resolve(JSON.parse(runFile.data.toString()));
	});
}

const storeRunFile = (runFile, runID) => {
	const moveFileTo = util.promisify(runFile.mv);
	const fileName = runID;
	const basePath = __dirname + '/../../public/runs';
	const fullPath = basePath + '/' + fileName;
	const downloadURL = config.baseUrl + '/api/runs/' + runID + '/download';
	return moveFileTo(fullPath).then(() => {
		return Promise.resolve({
			fileName: fileName,
			basePath: basePath,
			fullPath: fullPath,
			downloadURL: downloadURL,
		});
	});
}

const verifyMap = (mapID) => {
	return Map.find({
		where: { id: mapID },
	}).then(map => {
		if (!map) {
			const err = new Error('Bad request');
			err.status = 400;
			return Promise.reject(err);
		}
		return Promise.resolve(map);
	}); // TODO: error if map is not accepting runs?
}

const isNewPersonalBest = (runResults) => {
	return Run.min('time', {
		where: {
			mapID: runResults.mapID,
			playerID: runResults.playerID,
			flags: runResults.flags,
		}
	}).then(minTime => {
		let isNewPB = !minTime || (minTime > runResults.time);
		return Promise.resolve(isNewPB);
	});
}

const isNewWorldRecord = (runResults) => {
	return Run.min('time', {
		where: {
			mapID: runResults.mapID,
			flags: runResults.flags,
		}
	}).then(minTime => {
		let isNewWR = !minTime || (minTime > runResults.time);
		return Promise.resolve(isNewWR);
	});
}

const saveRun = (runResults, runFile) => {
	return sequelize.transaction(t => {
		let runModel = {};
		return updateStats(runResults, t)
		.then(() => {
			return Run.create(runResults, {
				include: { as: 'stats', model: RunStats },
				transaction: t
			});
		}).then(run => {
			runModel = run;
			if (!runResults.isPersonalBest)
				return Promise.resolve();
			return Run.update({
				isPersonalBest: false,
			}, {
				transaction: t,
				where: {
					isPersonalBest: true,
					id: {[Op.ne]: runModel.id },
				},
			});
		}).then(() => {
			return storeRunFile(runFile, runModel.id);
		}).then(results => {
			return runModel.update({ file: results.downloadURL }, {
				transaction: t,
			});
		}).then(() => {
			if (!runResults.isPersonalBest || runResults.isNewWorldRecord)
				return Promise.resolve(runResults);
			return activity.create({
				type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
				userID: runResults.playerID,
				data: runModel.id,
			}, t);
		}).then(() => {
			if (!runResults.isNewWorldRecord)
				return Promise.resolve(runResults);
			return activity.create({
				type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
				userID: runResults.playerID,
				data: runModel.id,
			}, t);
		}).then(() => {
			return Promise.resolve(runModel);
		});
	});
}

const updateStats = (runResults, transaction) => {
	let isFirstTimeCompletingMap = false;
	return Run.find({
		where: {
			mapID: runResults.mapID,
			playerID: runResults.playerID,
		},
	}).then(run => {
		const mapStatsUpdate = {
			totalCompletions: sequelize.literal('totalCompletions + 1'),
		};
		if (!run) {
			isFirstTimeCompletingMap = true;
			mapStatsUpdate.totalUniqueCompletions = sequelize.literal('totalUniqueCompletions + 1');
		}
		return MapStats.update(mapStatsUpdate, {
			where: { mapID: runResults.mapID },
			transaction: transaction,
		});
	}).then(() => {
		const userStatsUpdate = {
			totalJumps: sequelize.literal('totalJumps + ' + runResults.stats.totalJumps),
			totalStrafes: sequelize.literal('totalStrafes + ' + runResults.stats.totalStrafes),
		};
		if (isFirstTimeCompletingMap)
			userStatsUpdate.mapsCompleted = sequelize.literal('mapsCompleted + 1');
		return UserStats.update(userStatsUpdate, {
			where: { userID: runResults.playerID },
			transaction: transaction,
		});
	});
}

const genNotFoundErr = () => {
	const err = new Error('Run Not Found');
	err.status = 404;
	return err;
}

const Flag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	genNotFoundErr,

	create: (runFile) => {
		let runResults = {};
		return validateRunFile(runFile)
		.then(() => {
			return processRunFile(runFile);
		}).then(results => {
			runResults = results;
			return verifyMap(runResults.mapID);
		}).then(map => {
			runResults.mapID = map.id
			return isNewPersonalBest(runResults);
		}).then(isNewPB => {
			runResults.isPersonalBest = isNewPB;
			if (isNewPB) return isNewWorldRecord(runResults);
			else return Promise.resolve(false);
		}).then(isNewWR => {
			runResults.isNewWorldRecord = isNewWR;
			return saveRun(runResults, runFile);
		}).then(run => {
			if (run) {
				run = run.toJSON();
				run.isNewWorldRecord = runResults.isNewWorldRecord;
			}
			return Promise.resolve(run);
		});
	},

	getAll: (context) => {
		const queryContext = {
			where: { flags: 0 },
			limit: 10,
			include: [{
				model: User,
				include: [{
					model: Profile,
				}],
			}],
			order: [['time', 'ASC']],
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (context.mapID)
			queryContext.where.mapID = context.mapID;
		if (context.playerID)
			queryContext.where.playerID = context.playerID;
		if (context.flags)
			queryContext.where.flags = parseInt(context.flags) || 0;
		if (context.isPersonalBest)
			queryContext.where.isPersonalBest = context.isPersonalBest == 'true';
		return Run.findAndCountAll(queryContext);
	},

	get: (runID, context) => {
		const queryContext = {
			where: { id: runID },
			include: [{
				model: User,
				include: [{
					model: Profile,
				}],
			}],
		};
		return Run.find(queryContext);
	},

	getFilePath: (runID) => {
		return Run.find({
			where: { id: runID }
		}).then(run => {
			const runFilePath = __dirname + '/../../public/runs/' + runID;
			return Promise.resolve(run ? runFilePath : '');
		});
	}

};

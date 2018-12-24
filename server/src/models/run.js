'use strict';
const util = require('util'),
	crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapStats, Run, RunStats,
		RunZoneStats, MapZoneStats, BaseStats, User, UserStats } = require('../../config/sqlize'),
	activity = require('./activity'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	fs = require('fs');

const validateRunFile = (resultObj) => {
	return new Promise((resolve, reject) => {

		// TODO: consider checking endianness of the system and flipping bytes if needed

		let replay = {
			magic: readInt32(resultObj.bin, true),
			version: readInt8(resultObj.bin, true),
			header: {
				mapName: readString(resultObj.bin),
				mapHash: readString(resultObj.bin),
				playerName: readString(resultObj.bin),
				steamID: readString(resultObj.bin),
				tickRate: readFloat(resultObj.bin),
				runTime: readFloat(resultObj.bin),
				runFlags: readInt32(resultObj.bin, true),
				runDate_s: readString(resultObj.bin),
				startDif: readInt32(resultObj.bin),
				bonusZone: readInt32(resultObj.bin),
			},
			stats: [],
			frames: [],
		};

		const magicLE = 0x524D4F4D;
		if (resultObj.bin.ok &&
			replay.magic === magicLE &&
			replay.header.steamID === resultObj.playerID &&
			replay.header.mapHash === resultObj.map.hash &&
			replay.header.mapName === resultObj.map.name &&
			replay.header.runTime > 0)
		{
			// TODO: date check (reject "old" replays)
			replay.header.runDate = new Date(Number(replay.header.runDate_s) * 1000); // We're good til 2038...
			resolve(replay);
		}
		else {
			reject(genBadRequest());
		}
	});
};

const checkBuf = (o) => {
	let inRange = o.offset < o.buf.length;
	if (!inRange && o.ok)
		o.ok = false;
	return inRange;
};

const readString = (o) => {
	if (!checkBuf(o)) return null;
	const endOfStr = o.buf.indexOf('\0', o.offset, 'ascii');
	if (endOfStr !== -1 && endOfStr < o.buf.length) {
		const str = o.buf.toString('ascii', o.offset, endOfStr);
		o.offset = endOfStr + 1;
		return str;
	} else {
		o.ok = false;
		return '';
	}
};

const readFloat = (o) => {
	if (!checkBuf(o)) return null;
	const val = o.buf.readFloatLE(o.offset);
	o.offset += 4;
	return val;
};

const readInt32 = (o, unsigned = false) => {
	if (!checkBuf(o)) return null;
	const val = unsigned ? o.buf.readUInt32LE(o.offset) : o.buf.readInt32LE(o.offset);
	o.offset += 4;
	return val;
};

const readInt8 = (o, unsigned = false) => {
	if (!checkBuf(o)) return null;
	const val = unsigned ? o.buf.readUInt8(o.offset) : o.buf.readInt8(o.offset);
	o.offset++;
	return val;
};

const processRunFile = (resultObj) => {
	return new Promise((resolve, reject) => {

		const hasStats = readInt8(resultObj.bin);
		if (hasStats)
		{
			const numZones = readInt8(resultObj.bin, true);
			// 0 = total, 1 -> numZones + 1 = individual zones
			for (let i = 0; i < numZones + 1 && resultObj.bin.ok; i++)
			{
				let zoneStat = {
					zoneNum: i,
					baseStats: {
						jumps: readInt32(resultObj.bin, true),
						strafes: readInt32(resultObj.bin, true),
						avgStrafeSync: readFloat(resultObj.bin),
						avgStrafeSync2: readFloat(resultObj.bin),
						enterTime: readFloat(resultObj.bin),
						totalTime: readFloat(resultObj.bin),
						velMax3D: readFloat(resultObj.bin),
						velMax2D: readFloat(resultObj.bin),
						velAvg3D: readFloat(resultObj.bin),
						velAvg2D: readFloat(resultObj.bin),
						velEnter3D: readFloat(resultObj.bin),
						velEnter2D: readFloat(resultObj.bin),
						velExit3D: readFloat(resultObj.bin),
						velExit2D: readFloat(resultObj.bin),
					},
				};
				resultObj.replay.stats.push(zoneStat);
			}
		}

		const runFrames = readInt32(resultObj.bin, true);
		if (runFrames)
		{
			for (let i = 0; i < runFrames && resultObj.bin.ok; i++)
			{
				let runFrame = {
					eyeAngleX: readFloat(resultObj.bin),
					eyeAngleY: readFloat(resultObj.bin),
					eyeAngleZ: readFloat(resultObj.bin),
					posX: readFloat(resultObj.bin),
					posY: readFloat(resultObj.bin),
					posZ: readFloat(resultObj.bin),
					viewOffset: readFloat(resultObj.bin),
					buttons: readInt32(resultObj.bin),
				};
				resultObj.replay.frames.push(runFrame);
			}
		}

		if (!resultObj.bin.ok) {
			const err = new Error('Bad request');
			err.status = 400;
			reject(err);
		}
		else {
			const hash = crypto.createHash('sha1');
			hash.update(resultObj.bin);

			resultObj.runModel = {
				tickRate: resultObj.replay.header.tickRate,
				dateAchieved: resultObj.replay.header.runDate,
				time: resultObj.replay.header.runTime,
				flags: resultObj.replay.header.runFlags,
				hash: hash.digest('hex'),
				stats: {
					zoneStats: resultObj.replay.stats,
				},
				mapID: resultObj.map.id,
				playerID: resultObj.playerID,
			};

			resolve(resultObj);
		}

		// uint32 magic (4 bytes)
		// uint8 version number (1 byte)
		// ==> header
		// 		mapName (uint16 length + data) 2 bytes + data length bytes
		// 		mapHash (uint16 length + data) 2 bytes + data length bytes
		// 		playerName (uint16 length + data) 2 bytes + data length bytes
		// 		steamID (uint64) 8 bytes
		// 		tickRate (float) 4 bytes
		// 		runTime (float) 4 bytes
		// 		runFlags (uint32) 4 bytes
		// 		runDate (int64) 8 bytes
		// 		startDif (int32) 4 bytes
		// 		bonusZone (int32) 4 bytes
		// uint8 bool hasStats 1 byte
		// ==> run stats
		//      uint8 numZones (1 byte)
		//      for (i = 0 : numZones + 1) {
		//          zoneJumps[i] uint32 4 bytes
		//          zoneStrafes[i] uint32 4 bytes
		//          zoneStrafeSyncAvg[i] float 4 bytes
		//          zoneStrafeSyncAvg2[i] float 4 bytes
		//          zoneEnterTime[i] float 4 bytes
		//          zoneTime[i] float 4 bytes
		//          zoneVelMax3D[i] float 4 bytes
		//          zoneVelMax2D[i] float 4 bytes
		//          zoneVelAvg3D[i] float 4 bytes
		//          zoneVelAvg2D[i] float 4 bytes
		//          zoneEnterSpeed3D[i] float 4 bytes
		//          zoneEnterSpeed2D[i] float 4 bytes
		//          zoneExitSpeed3D[i] float 4 bytes
		//          zoneExitSpeed2D[i] float 4 bytes
		// ==> run frames
		//  int32 frameCount (4 bytes)
		// 		for (i = 0; i < frameCount)
		// 		     eyeAngleX float
		// 		     eyeAngleY float
		// 		     eyeAngleZ float
		// 		     posX float
		// 		     posY float
		// 		     posZ float
		// 		     viewOffset float
		// 		     buttons int32
	});
};

const storeRunFile = (resultObj, runID) => {
	return new Promise((res, rej) => {
		const fileName = runID;
		const basePath = __dirname + '/../../public/runs';
		const fullPath = basePath + '/' + fileName;
		const downloadURL = config.baseUrl + `/api/maps/${resultObj.map.id}/runs/${runID}/download`;

		fs.writeFile(fullPath, resultObj.bin.buf, (err) => {
			if (err)
				rej(err);
			res({
				fileName: fileName,
				basePath: basePath,
				fullPath: fullPath,
				downloadURL: downloadURL,
			})
		});
	});
};

const isNewPersonalBest = (resultObj) => {
	return Run.min('time', {
		where: {
			mapID: resultObj.map.id,
			playerID: resultObj.playerID,
			flags: resultObj.replay.header.runFlags,
		}
	}).then(minTime => {
		let isNewPB = !minTime || (minTime > resultObj.replay.header.runTime);
		return Promise.resolve(isNewPB);
	});
};

const isNewWorldRecord = (resultObj) => {
	return Run.min('time', {
		where: {
			mapID: resultObj.map.id,
			flags: resultObj.replay.header.runFlags,
		}
	}).then(minTime => {
		let isNewWR = !minTime || (minTime > resultObj.replay.header.runTime);
		return Promise.resolve(isNewWR);
	});
};

const saveRun = (resultObj) => {
	return sequelize.transaction(t => {
		let runModel = {};
		// First do MapZoneStats -> MapStats -> UserStats updating
		return updateStats(resultObj, t)
		.then(() => { // Create the run
			return Run.create(resultObj.runModel, {
				include: [{
						as: 'stats',
						model: RunStats,
						include: [{
							model: RunZoneStats,
							as: 'zoneStats',
							include: [{
								model: BaseStats,
								as: 'baseStats',
							}]
						}]
					}],
				transaction: t
			});
		}).then(run => { // Update old PB run to be no longer PB
			runModel = run;
			if (!resultObj.runModel.isPersonalBest)
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
		}).then(() => { // Store the run file
			return storeRunFile(resultObj, runModel.id);
		}).then(results => { // Update the download URL for the run
			return runModel.update({ file: results.downloadURL }, {
				transaction: t,
			});
		}).then(() => { // Generate PB notif if needed
			if (!resultObj.runModel.isPersonalBest || resultObj.isNewWorldRecord)
				return Promise.resolve();
			return activity.create({
				type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
				userID: resultObj.playerID,
				data: runModel.id,
			}, t);
		}).then(() => { // Generate WR notif if needed
			if (!resultObj.isNewWorldRecord)
				return Promise.resolve();
			return activity.create({
				type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
				userID: resultObj.playerID,
				data: runModel.id,
			}, t);
		}).then(() => {
			return Promise.resolve(runModel);
		});
	});
};

const updateStats = (resultObj, transaction) => {
	let isFirstTimeCompletingMap = false;

	const zoneUpdates = [];
	for (const zoneStat of resultObj.map.stats.zoneStats) {
		const zoneNum = zoneStat.zoneNum;
		const zoneBaseStats = resultObj.replay.stats[zoneNum].baseStats;
		zoneUpdates.push(zoneStat.baseStats.update({
			// Totals
			jumps: sequelize.literal(`if(jumps = 0, ${zoneBaseStats.jumps}, jumps + ${zoneBaseStats.jumps})`),
			strafes: sequelize.literal(`if(strafes = 0, ${zoneBaseStats.strafes}, strafes + ${zoneBaseStats.strafes})`),
			totalTime: sequelize.literal(`if(totalTime = 0, ${zoneBaseStats.totalTime}, totalTime + ${zoneBaseStats.totalTime})`),
			// Averages
			avgStrafeSync: sequelize.literal(`if(avgStrafeSync = 0, ${zoneBaseStats.avgStrafeSync}, avgStrafeSync / 2.0 + ${zoneBaseStats.avgStrafeSync / 2.0})`),
			avgStrafeSync2: sequelize.literal(`if(avgStrafeSync2 = 0, ${zoneBaseStats.avgStrafeSync2}, avgStrafeSync2 / 2.0 + ${zoneBaseStats.avgStrafeSync2 / 2.0})`),
			enterTime: sequelize.literal(`if(enterTime = 0, ${zoneBaseStats.enterTime}, enterTime / 2.0 + ${zoneBaseStats.enterTime / 2.0})`),
			velAvg3D: sequelize.literal(`if(velAvg3D = 0, ${zoneBaseStats.velAvg3D}, velAvg3D / 2.0 + ${zoneBaseStats.velAvg3D / 2.0})`),
			velAvg2D: sequelize.literal(`if(velAvg2D = 0, ${zoneBaseStats.velAvg2D}, velAvg2D / 2.0 + ${zoneBaseStats.velAvg2D / 2.0})`),
			velMax3D: sequelize.literal(`if(velMax3D = 0, ${zoneBaseStats.velMax3D}, velMax3D / 2.0 + ${zoneBaseStats.velMax3D / 2.0})`),
			velMax2D: sequelize.literal(`if(velMax2D = 0, ${zoneBaseStats.velMax2D}, velMax2D / 2.0 + ${zoneBaseStats.velMax2D / 2.0})`),
			velEnter3D: sequelize.literal(`if(velEnter3D = 0, ${zoneBaseStats.velEnter3D}, velEnter3D / 2.0 + ${zoneBaseStats.velEnter3D / 2.0})`),
			velEnter2D: sequelize.literal(`if(velEnter2D = 0, ${zoneBaseStats.velEnter2D}, velEnter2D / 2.0 + ${zoneBaseStats.velEnter2D / 2.0})`),
			velExit3D: sequelize.literal(`if(velExit3D = 0, ${zoneBaseStats.velExit3D}, velExit3D / 2.0 + ${zoneBaseStats.velExit3D / 2.0})`),
			velExit2D: sequelize.literal(`if(velExit2D = 0, ${zoneBaseStats.velExit2D}, velExit2D / 2.0 + ${zoneBaseStats.velExit2D / 2.0})`),
		}, {
			transaction: transaction
		}));
	}

	return Promise.all(zoneUpdates).then(() => { // MapZoneStats
		return Run.find({
			where: {
				mapID: resultObj.map.id,
				playerID: resultObj.playerID,
			},
		})
	}).then(run => { // MapStats
		const mapStatsUpdate = {
			totalCompletions: sequelize.literal('totalCompletions + 1'),
		};
		if (!run) {
			isFirstTimeCompletingMap = true;
			mapStatsUpdate.totalUniqueCompletions = sequelize.literal('totalUniqueCompletions + 1');
		}
		return MapStats.update(mapStatsUpdate, {
			where: { mapID: resultObj.map.id },
			transaction: transaction,
		});
	}).then(() => { // UserStats
		const userStatsUpdate = {
			totalJumps: sequelize.literal('totalJumps + ' + resultObj.replay.stats[0].baseStats.jumps),
			totalStrafes: sequelize.literal('totalStrafes + ' + resultObj.replay.stats[0].baseStats.strafes),
			rankXP: sequelize.literal('rankXP + 100'),
			cosXP: sequelize.literal('cosXP + 75'),
			runsSubmitted: sequelize.literal('runsSubmitted + 1'),
		};
		if (isFirstTimeCompletingMap)
			userStatsUpdate.mapsCompleted = sequelize.literal('mapsCompleted + 1');
		return UserStats.update(userStatsUpdate, {
			where: { userID: resultObj.playerID },
			transaction: transaction,
		});
	});
};

const genNotFoundErr = () => {
	const err = new Error('Run Not Found');
	err.status = 404;
	return err;
};

const genBadRequest = () => {
	const err = new Error('Bad request');
	err.status = 400;
	return err;
}

const Flag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	genNotFoundErr,

	create: (mapID, userID, runFile) => {
		if (runFile.length === 0) {
			return Promise.reject(genBadRequest());
		}

		let resultObj = {
			bin: {
				buf: runFile,
				offset: 0,
				ok: true,
			},
			playerID: userID,
		};

		return Map.findById(mapID, {
				include: [
					{model: MapInfo, as: 'info'},
					{model: MapStats, as: 'stats', include: [{model: MapZoneStats, as: 'zoneStats', include: [{model: BaseStats, as: 'baseStats'}]}]}
				]
		}).then(map => {
			if (!map) {
				return Promise.reject(genBadRequest());
			}
			return Promise.resolve(map);
		}).then(map => {
			resultObj.map = map;
			return validateRunFile(resultObj)
		}).then(replay => {
			resultObj.replay = replay;
			return processRunFile(resultObj);
		}).then(() => {
			return isNewPersonalBest(resultObj);
		}).then(isNewPB => {
			resultObj.runModel.isPersonalBest = isNewPB;
			return isNewPB ? isNewWorldRecord(resultObj) : Promise.resolve(false);
		}).then(isNewWR => {
			resultObj.isNewWorldRecord = isNewWR;
			return saveRun(resultObj);
		}).then(run => {
			const runJSON = run.toJSON();
			runJSON.isNewWorldRecord = resultObj.isNewWorldRecord;
			return Promise.resolve(runJSON);
		});
	},

	getAll: (queryParams) => {
		const queryOptions = {
			distinct: true,
			where: { flags: 0 },
			limit: 10,
			include: [{
				model: User
			}],
			order: [['time', 'ASC']],
		};
		if (queryParams.limit && !isNaN(queryParams.limit))
			queryOptions.limit = Math.min(Math.max(parseInt(queryParams.limit), 1), 20);
		if (queryParams.offset && !isNaN(queryParams.offset))
			queryOptions.offset = Math.min(Math.max(parseInt(queryParams.offset), 0), 5000);
		if (queryParams.mapID)
			queryOptions.where.mapID = queryParams.mapID;
		if (queryParams.playerID)
			queryOptions.where.playerID = queryParams.playerID;
		if (queryParams.playerIDs)
			queryOptions.where.playerID = { [Op.in]: queryParams.playerIDs.split(',') };
		if (queryParams.flags)
			queryOptions.where.flags = parseInt(queryParams.flags) || 0;
		if (queryParams.isPersonalBest)
			queryOptions.where.isPersonalBest = (queryParams.isPersonalBest === 'true');
		if (queryParams.order) {
			if (queryParams.order === 'date')
				queryOptions.order = [['createdAt', 'DESC']];
		}
		queryHelper.addExpansions(queryOptions, queryParams.expand, ['map', 'mapWithInfo']);
		return Run.findAndCountAll(queryOptions);
	},

	getByID: (runID, queryParams) => {
		const queryOptions = {
			where: { flags: 0 }
		};
		if (queryParams.mapID)
			queryOptions.where.mapID = queryParams.mapID;
		queryHelper.addExpansions(queryOptions, queryParams.expand, ['user', 'map', 'mapWithInfo', 'runStats']);
		return Run.findById(runID, queryOptions);
	},

	getFilePath: (runID) => {
		return Run.findById(runID).then(run => {
			const runFilePath = __dirname + '/../../public/runs/' + runID;
			return Promise.resolve(run ? runFilePath : '');
		});
	}

};

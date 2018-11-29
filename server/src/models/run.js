'use strict';
const util = require('util'),
	{ sequelize, Op, Map, MapStats, Run, RunStats, User, UserStats, Profile } = require('../../config/sqlize'),
	activity = require('./activity'),
	config = require('../../config/config'),
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
				runDate: new Date(Number(readString(resultObj.bin))),
				startDif: readInt32(resultObj.bin),
				bonusZone: readInt32(resultObj.bin),
			},
			stats: [],
			frames: [],
		};

		const magicLE = 0x524D4F4D;
		if (replay.magic === magicLE &&
			replay.header.steamID === resultObj.playerID &&
			replay.header.mapHash === resultObj.map.hash &&
			replay.header.mapName === resultObj.map.name &&
			replay.header.runTime > 0)
		// TODO: date check (reject "old" replays)
		{
			resolve(replay);
		}
		else {
			const err = new Error('Bad request');
			err.status = 400;
			reject(err);
		}
	});
};

const readString = (o) => {
	const strLen = o.buf.readUInt16LE(o.offset);
	o.offset += 2;
	const str = o.buf.toString('ascii', o.offset, o.offset + strLen);
	o.offset += strLen;
	return str;
};

const readFloat = (o) => {
	const val = o.buf.readFloatLE(o.offset);
	o.offset += 4;
	return val;
};

const readInt32 = (o, unsigned = false) => {
	const val = unsigned ? o.buf.readUInt32LE(o.offset) : o.buf.readInt32LE(o.offset);
	o.offset += 4;
	return val;
};

const readInt8 = (o, unsigned = false) => {
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
			for (let i = 0; i < numZones + 1; i++)
			{
				let zoneStat = {
					jumps: readInt32(resultObj.bin, true),
					strafes: readInt32(resultObj.bin, true),
					strafeSyncAvg: readFloat(resultObj.bin),
					strafeSyncAvg2: readFloat(resultObj.bin),
					enterTime: readFloat(resultObj.bin),
					totalTime: readFloat(resultObj.bin),
					velMax3D: readFloat(resultObj.bin),
					velMax2D: readFloat(resultObj.bin),
					velAvg3D: readFloat(resultObj.bin),
					velAvg2D: readFloat(resultObj.bin),
					enterSpeed3D: readFloat(resultObj.bin),
					enterSpeed2D: readFloat(resultObj.bin),
					exitSpeed3D: readFloat(resultObj.bin),
					exitSpeed2D: readFloat(resultObj.bin),
				};
				resultObj.replay.stats.push(zoneStat);
			}
		}

		const runFrames = readInt32(resultObj.bin, true);
		if (runFrames)
		{
			for (let i = 0; i < runFrames; i++)
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

		resultObj.runModel = {
			tickrate: resultObj.replay.header.tickRate,
			dateAchieved: resultObj.replay.header.runDate,
			time: resultObj.replay.header.runTime,
			flags: resultObj.replay.header.runFlags,
			stats: resultObj.replay.stats[0],
			mapID: resultObj.map.id,
			playerID: resultObj.playerID,
		};

		resolve(resultObj);

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

const storeRunFile = (runFile, mapID, runID) => {
	return new Promise((res, rej) => {
		const fileName = runID;
		const basePath = __dirname + '/../../public/runs';
		const fullPath = basePath + '/' + fileName;
		const downloadURL = config.baseUrl + `/api/maps/${mapID}/runs/${runID}/download`;

		fs.writeFile(fullPath, runFile, (err) => {
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

// TODO: rip this apart and make it flow a bit better -- stats should be in own methods, etc
const saveRun = (resultObj, runFile) => {
	return sequelize.transaction(t => {
		let runModel = {};
		return updateStats(resultObj, t)
		.then(() => {
			return Run.create(resultObj.runModel, {
				include: { as: 'stats', model: RunStats },
				transaction: t
			});
		}).then(run => {
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
		}).then(() => {
			return storeRunFile(runFile, resultObj.map.id, runModel.id);
		}).then(results => {
			return runModel.update({ file: results.downloadURL }, {
				transaction: t,
			});
		}).then(() => {
			if (!resultObj.runModel.isPersonalBest || resultObj.isNewWorldRecord)
				return Promise.resolve();
			return activity.create({
				type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
				userID: resultObj.playerID,
				data: runModel.id,
			}, t);
		}).then(() => {
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
	return Run.find({
		where: {
			mapID: resultObj.map.id,
			playerID: resultObj.playerID,
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
			where: { mapID: resultObj.map.id },
			transaction: transaction,
		});
	}).then(() => {
		const userStatsUpdate = {
			totalJumps: sequelize.literal('totalJumps + ' + resultObj.replay.stats[0].jumps),
			totalStrafes: sequelize.literal('totalStrafes + ' + resultObj.replay.stats[0].strafes),
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

const Flag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	genNotFoundErr,

	create: (mapID, userID, runFile) => {
		let resultObj = {
			bin: {
				buf: runFile,
				offset: 0,
			},
			playerID: userID,
		};

		return Map.find({
			where: {id: mapID}
		}).then(map => {
			if (!map) {
				const err = new Error('Bad request');
				err.status = 400;
				return Promise.reject(err);
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
			return saveRun(resultObj, runFile);
		}).then(run => {
			const runJSON = run.toJSON();
			runJSON.isNewWorldRecord = resultObj.isNewWorldRecord;
			return Promise.resolve(runJSON);
		});
	},

	getAll: (context) => {
		const queryContext = {
			distinct: true,
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
			queryContext.where.isPersonalBest = (context.isPersonalBest === 'true');
		return Run.findAndCountAll(queryContext);
	},

	get: (mapID, runID, context) => {
		return Map.find({
			where: {mapID: mapID}
		}).then(map => {
			if (map) {
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
			}
			else {
				const err = new Error("Failed to find map!");
				err.status = 404;
				return Promise.reject(err);
			}
		});

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

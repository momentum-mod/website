'use strict';
const crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapStats, Run, RunStats,
		RunZoneStats, MapZoneStats, BaseStats, User, UserStats, UserMapRank } = require('../../config/sqlize'),
	activity = require('./activity'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	ServerError = require('../helpers/server-error'),
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
		const b1 = resultObj.bin.ok, b2 = replay.magic === magicLE,
			b3 = replay.header.steamID === resultObj.playerID,
			b4 = replay.header.mapHash === resultObj.map.hash,
			b5 = replay.header.mapName === resultObj.map.name,
			b6 = replay.header.runTime > 0;
		if (b1 && b2 && b3 && b4 && b5 && b6)
		{
			// TODO: date check (reject "old" replays)
			replay.header.runDate = new Date(Number(replay.header.runDate_s) * 1000); // We're good til 2038...
			resolve(replay);
		}
		else {
			// console.log([b1, b2, b3, b4, b5, b6]);
			reject(new ServerError(400, 'Bad request'));
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
			reject(new ServerError(400, 'Bad request'));
		}
		else {
			const hash = crypto.createHash('sha1');
			hash.update(resultObj.bin.buf);

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
	return UserMapRank.findOrCreate({
		where: {
			mapID: resultObj.map.id,
			userID: resultObj.playerID,
		},
		defaults: {
			mapID: resultObj.map.id,
			userID: resultObj.playerID,
		},
		include: [
			{
				model: Run,
				as: 'run',
			}
		]
	}).spread((mapRank, created) => {
		resultObj.mapRank = mapRank;
		if (created) {
			// It's definitely a PB
			return Promise.resolve(true);
		} else {
			let isNewPB = !mapRank.run.time || (mapRank.run.time > resultObj.replay.header.runTime);
			return Promise.resolve(isNewPB);
		}
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
		// First do MapZoneStats -> MapStats -> UserStats -> UserMapRank updating
		return updateStats(resultObj, t).then(() => { // Create the run
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
			return resultObj.mapRank.update({runID: run.id}, {transaction: t}).then(() => {
				return Run.update({isPersonalBest: false}, {
					transaction: t,
					where: {
						isPersonalBest: true,
						id: {[Op.ne]: runModel.id },
					},
				});
			});
		}).then(() => { // Store the run file
			return storeRunFile(resultObj, runModel.id);
		}).then(results => { // Update the download URL for the run
			return runModel.update({ file: results.downloadURL }, {transaction: t});
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

const updateUserRankXP = (userID, transaction) => {
	return UserMapRank.sum('rankXP', {
		where: {
			userID: userID
		},
		transaction: transaction
	}).then(sum => {
		return UserStats.update({rankXP: sum}, {
			where: {
				userID: userID,
			},
			transaction: transaction
		})
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
			raw: true,
			transaction: transaction,
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
	}).then(() => { // UserMapRank
		if (resultObj.runModel.isPersonalBest) {
			// Update the UserMapRank for this user only if a new PB is achieved
			return Run.count({
				where: {
					time: {
						[Op.lte]: resultObj.runModel.time,
					},
					flags: resultObj.runModel.flags,
				},
				transaction: transaction,
			}).then(count => { // With the count, set our rank and rankXP
				resultObj.mapRank.rank = count + 1;
				// TODO: calculate rankXP based on the factors determined by community
				resultObj.mapRank.rankXP = Math.round(2000 / (count + 1));
				return resultObj.mapRank.save({transaction: transaction});
			}).then(() => { // Update this user's rank XP total
				return updateUserRankXP(resultObj.playerID, transaction);
			}).then(() => { // Update everyone else
				return UserMapRank.findAll({
					where: {
						mapID: resultObj.map.id,
						userID: {
							[Op.ne]: resultObj.playerID,
						},
						rank: {
							[Op.gte]: resultObj.mapRank.rank,
						}
					},
					transaction: transaction,
				}).then(results => {
					const updates = [];
					for (const result of results) {
						result.rank += 1;
						// TODO: calculate rankXP based on the factors determined by community
						result.rankXP = (2000 / (result.rank));
						updates.push(result.save({transaction: transaction}).then(() => {
							// And update their profile's rankXP
							return updateUserRankXP(result.userID, transaction);
						}));
					}
					return Promise.all(updates);
				})
			})
		} else return Promise.resolve();
	}).then(() => { // UserStats
		const userStatsUpdate = {
			totalJumps: sequelize.literal('totalJumps + ' + resultObj.replay.stats[0].baseStats.jumps),
			totalStrafes: sequelize.literal('totalStrafes + ' + resultObj.replay.stats[0].baseStats.strafes),
			// TODO: calculate cosmetic XP for getting a (PB/WR/etc) run based on community input
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

const Flag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	create: (mapID, userID, runFile) => {
		if (runFile.length === 0) {
			return Promise.reject(new ServerError(400, 'Bad request'));
		}

		let resultObj = {
			bin: {
				buf: runFile,
				offset: 0,
				ok: true,
			},
			playerID: userID,
			mapRank: null,
		};

		return Map.findById(mapID, {
				include: [
					{model: MapInfo, as: 'info'},
					{model: MapStats, as: 'stats', include: [{model: MapZoneStats, as: 'zoneStats', include: [{model: BaseStats, as: 'baseStats'}]}]}
				]
		}).then(map => {
			if (!map)
				return Promise.reject(new ServerError(400, 'Bad request'));
			resultObj.map = map;
			return Promise.resolve();
		}).then(() => {
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
			include: [
				{
					model: User
				},
				{
					model: UserMapRank,
					as: 'rank',
					attributes: ['rank'],
					required: false,
				}
			],
			order: [['time', 'ASC']],
		};
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.mapID)
			queryOptions.where.mapID = queryParams.mapID;
		if (queryParams.playerID)
			queryOptions.where.playerID = queryParams.playerID;
		if (queryParams.playerIDs)
			queryOptions.where.playerID = { [Op.in]: queryParams.playerIDs.split(',') };
		if (queryParams.flags)
			queryOptions.where.flags = parseInt(queryParams.flags) || 0;
		if (queryParams.isPersonalBest)
			queryOptions.where.isPersonalBest = (queryParams.isPersonalBest === true);
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
        queryHelper.addExpansions(queryOptions, queryParams.expand, ['user', 'map', 'mapWithInfo', 'runStats', 'rank']);
		return Run.findById(runID, queryOptions);
	},

	getAround: (userID, mapID, queryParams) => {
		return UserMapRank.find({
			where: {
				mapID: mapID,
				userID: userID,
			},
			raw: true,
		}).then(userMapRank => {
			if (userMapRank) {
				const queryOptions = {
					where: {
						mapID: mapID,
					},
					order: [
						['rank', 'ASC'],
					],
					include: [{
						model: Run,
						as: 'run',
						include: [{
							model: User,
							as: 'user'
						}]
					}],
					offset: Math.max(userMapRank.rank - 5, 0),
					limit: 11, // 5 + yours + 5
					attributes: ['rank']
				};

				if (queryParams.limit)
					queryOptions.limit = Math.min(Math.max(1, context.limit), 21);

				return UserMapRank.findAndCountAll(queryOptions)
			} else {
				// They don't have a time, error out
				return Promise.reject(new ServerError(403, 'No personal best detected'));
			}
		});
	},

	getFilePath: (runID) => {
		return Run.findById(runID).then(run => {
			const runFilePath = __dirname + '/../../public/runs/' + runID;
			return Promise.resolve(run ? runFilePath : '');
		});
	},

	deleteRunFile: (runID) => {
		const runFilePath = __dirname + '/../../public/runs/' + runID;
		return new Promise((resolve, reject) => {
			fs.stat(runFilePath, err => {
				if (err) {
					if (err.code === 'ENOENT')
						return resolve();
					else
						return reject(err);
				}
				fs.unlink(runFilePath, err => {
					if (err)
						return reject(err);
					resolve();
				});  
			});
		});
	},

	delete: (runID) => {
		return module.exports.deleteRunFile(runID).then(() => {
			return Run.destroy({ where: { id: runID }});
		});
	},

};

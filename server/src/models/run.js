'use strict';
const crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapStats, Run,
		RunZoneStats, BaseStats, User, UserStats, UserMapRank,
		MapTrack, MapTrackStats, MapZone, MapZoneStats, XPSystems,
	} = require('../../config/sqlize'),
	activity = require('./activity'),
	xpSystems = require('./xp-systems'),
	mapMdl = require('./map'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	ServerError = require('../helpers/server-error'),
	fs = require('fs');

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

const validateRunSession = (resultObj) => {
	const tsLen = resultObj.ses.timestamps ? resultObj.ses.timestamps.length : 0;
	if (resultObj.ses.zoneNum > 0) {
		if (tsLen !== 0)
			return Promise.reject(new ServerError(400, 'Invalid timestamps for session'));
	}
	else {
		const sesTrackZones = resultObj.track.numZones;

		if (tsLen > 0) {
			if (tsLen !== (sesTrackZones - 1)) // - 1 because the start trigger doesn't have a timestamp generated for it
				return Promise.reject(new ServerError(400, 'Timestamp length does not match!'));

			let prevTick = 0;
			resultObj.ses.timestamps.sort((left, right) => {
				if (left.zone < right.zone)
					return -1;
				else if (left.zone > right.zone)
					return 1;
				else return 0;
			});
			for (const ts of resultObj.ses.timestamps) {
				if (ts.tick <= prevTick)
					return Promise.reject(new ServerError(400, 'Out of order timestamps!'));

				prevTick = ts.tick;
			}
		}
		else { // tsLen === 0
			if (sesTrackZones !== 1)
				return Promise.reject(new ServerError(400, 'Not enough timestamps'));
		}
	}

	return Promise.resolve();
};

const validateRunFile = (resultObj) => {
	return new Promise((resolve, reject) => {

		let replay = {
			magic: readInt32(resultObj.bin, true),
			version: readInt8(resultObj.bin, true),
			header: {
				mapName: readString(resultObj.bin),
				mapHash: readString(resultObj.bin),
				playerName: readString(resultObj.bin),
				steamID: readString(resultObj.bin),
				tickRate: readFloat(resultObj.bin),
				runFlags: readInt32(resultObj.bin, true),
				runDate_s: readString(resultObj.bin),
				startTick: readInt32(resultObj.bin, true),
				stopTick: readInt32(resultObj.bin, true),
				trackNum: readInt8(resultObj.bin, true),
				zoneNum: readInt8(resultObj.bin, true),
			},
			overallStats: {},
			zoneStats: [],
			frames: [],
		};

		const nowDate = Date.now();
		const sesDiff = nowDate - resultObj.ses.createdAt.getTime();
		const runTimeTick = replay.header.stopTick - replay.header.startTick;
		const runTime = runTimeTick * replay.header.tickRate;
		const runSesDiff = Math.abs(sesDiff - (runTime * 1000)) / 1000.0;
		const magicLE = 0x524D4F4D;

		// 5 seconds for the stop tick -> end record -> submit, then we add a second for every minute in the replay
		// so longer replays have more time to submit, up to a max of 10 seconds
		// If it goes over we just stuff the resultObj extra with values so we can debug it
		const sesCheck = runSesDiff < (5.0 + Math.min(Math.floor(runTime / 60.0), 10.0));
		if (!sesCheck)
		{
			resultObj.extra.runSes = {
				sesDiff: sesDiff,
				runTime: runTime,
				runSesDiff: runSesDiff
			}
		}

		// TODO allow custom tickrates in the future (1.0.0+)
		const toCheckTR = mapMdl.getDefaultTickrateForMapType(resultObj.map.type);
		const epsil = 0.000001;

		const allowedGameModes = [
			mapMdl.MAP_TYPE.SURF,
			mapMdl.MAP_TYPE.BHOP,
			mapMdl.MAP_TYPE.RJ,
			mapMdl.MAP_TYPE.SJ
		];

		const checks = [
			resultObj.bin.ok,
			replay.magic === magicLE,
			replay.header.steamID === resultObj.steamID,
			replay.header.mapHash === resultObj.map.hash,
			replay.header.mapName === resultObj.map.name,
			runTimeTick > 0,
			replay.header.trackNum === resultObj.ses.trackNum,
			replay.header.runFlags === 0, // TODO removeme when we support runFlags (0.9.0)
			replay.header.zoneNum === resultObj.ses.zoneNum,
			!Number.isNaN(Number(replay.header.runDate_s)),
			Math.abs(replay.header.tickRate - toCheckTR) < epsil,
			(runTime * 1000.0) <= sesDiff,
			allowedGameModes.includes(resultObj.map.type)
		];

		if (!checks.includes(false))
		{
			replay.header.ticks = runTimeTick;
			resolve(replay);
		}
		else {
			reject(new ServerError(400, 'Bad request, ' + checks.join(' ')));
		}
	});
};

const parseBaseStats = (resultObj) => {
	return {
		jumps: readInt32(resultObj.bin, true),
		strafes: readInt32(resultObj.bin, true),
		avgStrafeSync: readFloat(resultObj.bin),
		avgStrafeSync2: readFloat(resultObj.bin),
		enterTime: readInt32(resultObj.bin, true) * resultObj.replay.header.tickRate,
		totalTime: readInt32(resultObj.bin, true) * resultObj.replay.header.tickRate,
		velMax3D: readFloat(resultObj.bin),
		velMax2D: readFloat(resultObj.bin),
		velAvg3D: readFloat(resultObj.bin),
		velAvg2D: readFloat(resultObj.bin),
		velEnter3D: readFloat(resultObj.bin),
		velEnter2D: readFloat(resultObj.bin),
		velExit3D: readFloat(resultObj.bin),
		velExit2D: readFloat(resultObj.bin),
	};
};

const processRunFile = (resultObj) => {
	return new Promise((resolve, reject) => {

		// Stats
		let bReadStats = false;
		const hasStats = readInt8(resultObj.bin);
		if (hasStats) {
			const numZones = readInt8(resultObj.bin, true);
			if (numZones) {
				if (resultObj.replay.header.zoneNum === 0) {
					// 0 = overallStats, 1 -> numZones + 1 = individual zone stats
					for (let i = 0; i < numZones + 1 && resultObj.bin.ok; i++) {
						if (i === 0)
							resultObj.replay.overallStats = parseBaseStats(resultObj);
						else
							resultObj.replay.zoneStats.push({
								zoneNum: i,
								baseStats: parseBaseStats(resultObj),
							});
					}
					bReadStats = resultObj.bin.ok;
				}
				else if (numZones === 1) {
					// There's only one zone stats, no need for a loop or creating zone stats
					resultObj.replay.overallStats = parseBaseStats(resultObj);
					bReadStats = resultObj.bin.ok;
				}
			}
		}
		if (!bReadStats)
			reject(new ServerError(400, 'Bad request'));

		// Frames
		const runFrames = readInt32(resultObj.bin, true);
		if (runFrames && runFrames >= resultObj.replay.header.stopTick) {
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
		} else {
			reject(new ServerError(400, 'Bad request'));
		}

		if (!resultObj.bin.ok) {
			reject(new ServerError(400, 'Bad request'));
		}
		else {
			const hash = crypto.createHash('sha1');
			hash.update(resultObj.bin.buf);

			resultObj.runModel = {
				mapID: resultObj.map.id,
				playerID: resultObj.userID,
				trackNum: resultObj.replay.header.trackNum,
				zoneNum: resultObj.replay.header.zoneNum,
				ticks: resultObj.replay.header.ticks,
				tickRate: resultObj.replay.header.tickRate,
				flags: resultObj.replay.header.runFlags,
				hash: hash.digest('hex'),
				overallStats: resultObj.replay.overallStats,
			};

			if (resultObj.replay.zoneStats.length)
				resultObj.runModel.zoneStats = resultObj.replay.zoneStats;

			resolve(resultObj);
		}
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

const isNewPersonalBest = (resultObj, transact) => {
	const attrs = {
		mapID: resultObj.map.id,
		userID: resultObj.userID,
		gameType: resultObj.map.type,
		trackNum: resultObj.replay.header.trackNum,
		zoneNum: resultObj.replay.header.zoneNum,
		flags: resultObj.replay.header.runFlags,
	};
	return UserMapRank.findOrCreate({
		where: attrs,
		defaults: attrs,
		include: [{model: Run, as: 'run'}],
		transaction: transact,
	}).spread((mapRank, created) => {
		resultObj.mapRank = mapRank;
		resultObj.createdMapRank = created;
		if (created) {
			// It's definitely a PB
			return Promise.resolve(true);
		} else {
			let isNewPB = !mapRank.run.ticks || (mapRank.run.ticks > resultObj.replay.header.ticks);
			return Promise.resolve(isNewPB);
		}
	});
};

const isNewWorldRecord = (resultObj, transact) => {
	return UserMapRank.findOne({
		where: {
			rank: 1,
			mapID: resultObj.map.id,
			gameType: resultObj.map.type,
			flags: resultObj.replay.header.runFlags,
			trackNum: resultObj.replay.header.trackNum,
			zoneNum: resultObj.replay.header.zoneNum,
		},
		include: [{model: Run, as: 'run'}],
		transaction: transact,
	}).then(found => {
		let isNewWR = true;
		if (found) {
			isNewWR = !found.run.ticks || (found.run.ticks > resultObj.replay.header.ticks);
		}
		return Promise.resolve(isNewWR);
	});
};

const saveRun = (resultObj, transact) => {
	let runModel = {};
	// First do TrackStats -> (ZoneStats / MapStats) -> UserMapRank updating -> UserStats
	return updateStats(resultObj, transact).then(() => { // Create the run
		return Run.create(resultObj.runModel, {
			include: [
				{
					model: BaseStats,
					as: 'overallStats',
				},
				{
					model: RunZoneStats,
					as: 'zoneStats',
					include: [{model: BaseStats, as: 'baseStats'}]
				}],
			transaction: transact
		});
	}).then(run => { // Update old PB run to be no-longer PB, if there was one
		runModel = run;
		if (!resultObj.isPersonalBest)
			return Promise.resolve();

		return resultObj.mapRank.update({runID: run.id}, {transaction: transact});
	}).then(() => { // Store the run file
		return storeRunFile(resultObj, runModel.id);
	}).then(results => { // Update the download URL for the run
		return runModel.update({ file: results.downloadURL }, {transaction: transact});
	}).then(() => { // Generate PB notifications
		if (!resultObj.isPersonalBest || resultObj.isNewWorldRecord)
			return Promise.resolve();
		return activity.create({
			type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
			userID: resultObj.userID,
			data: runModel.id,
		}, transact);
	}).then(() => { // Generate WR notifications if needed
		if (!resultObj.isNewWorldRecord)
			return Promise.resolve();
		return activity.create({
			type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
			userID: resultObj.userID,
			data: runModel.id,
		}, transact);
	}).then(() => {
		return Promise.resolve(runModel);
	});
};

const updateBaseStats = (baseStats) => {
	return {
		// Totals
		jumps: sequelize.literal(`if(jumps = 0, ${baseStats.jumps}, jumps + ${baseStats.jumps})`),
		strafes: sequelize.literal(`if(strafes = 0, ${baseStats.strafes}, strafes + ${baseStats.strafes})`),
		totalTime: sequelize.literal(`if(totalTime = 0, ${baseStats.totalTime}, totalTime + ${baseStats.totalTime})`),
		// Averages
		avgStrafeSync: sequelize.literal(`if(avgStrafeSync = 0, ${baseStats.avgStrafeSync}, avgStrafeSync / 2.0 + ${baseStats.avgStrafeSync / 2.0})`),
		avgStrafeSync2: sequelize.literal(`if(avgStrafeSync2 = 0, ${baseStats.avgStrafeSync2}, avgStrafeSync2 / 2.0 + ${baseStats.avgStrafeSync2 / 2.0})`),
		enterTime: sequelize.literal(`if(enterTime = 0, ${baseStats.enterTime}, enterTime / 2.0 + ${baseStats.enterTime / 2.0})`),
		velAvg3D: sequelize.literal(`if(velAvg3D = 0, ${baseStats.velAvg3D}, velAvg3D / 2.0 + ${baseStats.velAvg3D / 2.0})`),
		velAvg2D: sequelize.literal(`if(velAvg2D = 0, ${baseStats.velAvg2D}, velAvg2D / 2.0 + ${baseStats.velAvg2D / 2.0})`),
		velMax3D: sequelize.literal(`if(velMax3D = 0, ${baseStats.velMax3D}, velMax3D / 2.0 + ${baseStats.velMax3D / 2.0})`),
		velMax2D: sequelize.literal(`if(velMax2D = 0, ${baseStats.velMax2D}, velMax2D / 2.0 + ${baseStats.velMax2D / 2.0})`),
		velEnter3D: sequelize.literal(`if(velEnter3D = 0, ${baseStats.velEnter3D}, velEnter3D / 2.0 + ${baseStats.velEnter3D / 2.0})`),
		velEnter2D: sequelize.literal(`if(velEnter2D = 0, ${baseStats.velEnter2D}, velEnter2D / 2.0 + ${baseStats.velEnter2D / 2.0})`),
		velExit3D: sequelize.literal(`if(velExit3D = 0, ${baseStats.velExit3D}, velExit3D / 2.0 + ${baseStats.velExit3D / 2.0})`),
		velExit2D: sequelize.literal(`if(velExit2D = 0, ${baseStats.velExit2D}, velExit2D / 2.0 + ${baseStats.velExit2D / 2.0})`),
	}
};

const updateStats = (resultObj, transaction) => {

	let isEntireTrack = resultObj.replay.header.zoneNum === 0;
	let isEntireMainTrack = resultObj.replay.header.trackNum === 0 && isEntireTrack;
	let playerCompletedMainTrackBefore = !resultObj.createdMapRank && isEntireMainTrack;
	let playerCompletedThisTrackBefore = false;
	let playerCompletedThisZoneBefore = false;

	return Run.findOne({
		where: {
			mapID: resultObj.map.id,
			playerID: resultObj.userID,
			trackNum: resultObj.replay.header.trackNum,
			zoneNum: 0,
		},
		transaction: transaction,
	}).then(run => {
		if (run)
			playerCompletedThisTrackBefore = true;

		if (isEntireTrack) {
			playerCompletedThisZoneBefore = playerCompletedThisTrackBefore;
			return Promise.resolve();
		}
		else {
			return RunZoneStats.findOne({
				where: {
					zoneNum: resultObj.replay.header.zoneNum,
				},
				include: [{
					model: Run,
					where: {
						mapID: resultObj.map.id,
						playerID: resultObj.userID,
					}
				}],
				transaction: transaction,
			}).then(runZoneStats => {
				if (runZoneStats)
					playerCompletedThisZoneBefore = true;
				return Promise.resolve();
			});
		}
	}).then(() => {

		// Now, depending on if we're a singular zone or the whole track, we need to update our stats accordingly
		let updates = [];

		if (isEntireTrack) {
			// It's the entire track. Update the track's stats, each of its zones, and the map's stats as well
			// The track's stats come from replay.overallStats
			const trackUpd8Obj = {
				completions: sequelize.literal('completions + 1'),
			};

			if (!playerCompletedThisTrackBefore)
				trackUpd8Obj.uniqueCompletions = sequelize.literal('uniqueCompletions + 1');

			updates.push(resultObj.track.stats.update(trackUpd8Obj, {transaction: transaction}));
			updates.push(resultObj.track.stats.baseStats.update(updateBaseStats(resultObj.replay.overallStats), {transaction: transaction}));

			for (const zone of resultObj.track.zones) {
				if (zone.zoneNum === 0) continue;
				const zoneUpd8Obj = {
					completions: sequelize.literal('completions + 1'),
				};
				if (!playerCompletedThisZoneBefore)
					zoneUpd8Obj.uniqueCompletions = sequelize.literal('uniqueCompletions + 1');

				updates.push(zone.stats.update(zoneUpd8Obj, {transaction: transaction}));
				updates.push(zone.stats.baseStats.update(
					updateBaseStats(resultObj.replay.zoneStats[zone.zoneNum - 1].baseStats), {transaction: transaction}));
			}

			// Lastly update the map stats as well, if it was the main track
			if (isEntireMainTrack) {
				const mapUpd8Obj = {
					totalCompletions: sequelize.literal('totalCompletions + 1'),
				};

				if (!playerCompletedMainTrackBefore)
					mapUpd8Obj.totalUniqueCompletions = sequelize.literal('totalUniqueCompletions + 1');

				updates.push(resultObj.map.stats.update(mapUpd8Obj, {transaction: transaction}));
				updates.push(resultObj.map.stats.baseStats.update(updateBaseStats(resultObj.replay.overallStats), {transaction: transaction}));
			}
		}
		else {
			// It's a particular zone, so update just it.
			// The zone's stats are from replay.overallStats
			for (const zone of resultObj.track.zones) {
				if (zone.zoneNum === resultObj.replay.header.zoneNum) {
					const zoneUpd8Obj = {
						completions: sequelize.literal('completions + 1'),
					};
					if (!playerCompletedThisZoneBefore)
						zoneUpd8Obj.uniqueCompletions = sequelize.literal('uniqueCompletions + 1');

					updates.push(zone.stats.update(zoneUpd8Obj, {transaction: transaction}));
					updates.push(zone.stats.baseStats.update(updateBaseStats(resultObj.replay.overallStats), {transaction: transaction}));
					break;
				}
			}
		}

		return Promise.all(updates);
	}).then(() => {
		// Phew, out of the map related stats, now let's go onwards to the UserMapRank
		// We only care to update our UserMapRank if we were a PB (or if we created the UMR object; same thing)
		if (resultObj.isPersonalBest) {
			const runCategory = {
				mapID: resultObj.map.id,
				gameType: resultObj.map.type,
				flags: resultObj.replay.header.runFlags,
				trackNum: resultObj.replay.header.trackNum,
				zoneNum: resultObj.replay.header.zoneNum,
			};

			// First we need overall completions for this category
			let completions = 0;
			return UserMapRank.count({
				where: runCategory,
				transaction: transaction,
			}).then(count => {
				completions = count;
				return UserMapRank.count({
					where: runCategory,
					include: [{
						model: Run,
						where: {ticks: {[Op.lte]: resultObj.runModel.ticks}}
					}],
					transaction: transaction,
				})
			}).then(count => { // With our placement, set our rank and rankXP
				if (!resultObj.createdMapRank) {
					resultObj.oldRankXP = resultObj.mapRank.rankXP;
					resultObj.oldRank = resultObj.mapRank.rank;
				}

				resultObj.mapRank.rank = count + 1;
				resultObj.xp.rankXP = xpSystems.getRankXPForRank(count + 1, completions);
				resultObj.mapRank.rankXP = resultObj.xp.rankXP.rankXP;
				return resultObj.mapRank.save({transaction: transaction});
			}).then(() => { // Update everyone else

				// If we only improved our rank (and therefore didn't create a UMR object), the range of updates
				// is [newRank, oldRank) people, otherwise, it's everyone below (and including) our new rank.
				let rankSearch = resultObj.createdMapRank ?
					{[Op.gte]: resultObj.mapRank.rank} :
					{[Op.between]: [resultObj.mapRank.rank, resultObj.oldRank - 1]};

				return UserMapRank.findAll({
					where: {
						mapID: resultObj.map.id,
						gameType: resultObj.map.type,
						flags: resultObj.replay.header.runFlags,
						trackNum: resultObj.replay.header.trackNum,
						zoneNum: resultObj.replay.header.zoneNum,
						userID: {
							// Because we go below (and including) our new rank, we gotta
							// filter out ourselves.
							[Op.ne]: resultObj.userID,
						},
						rank: rankSearch,
					},
					transaction: transaction,
				}).then(results => {
					const updates = [];
					for (const result of results) {
						result.rank += 1;
						result.rankXP = xpSystems.getRankXPForRank(result.rank, completions).rankXP;
						updates.push(result.save({transaction: transaction}));
					}
					return Promise.all(updates);
				})
			});
		}
		else return Promise.resolve();
	}).then(() => { // Last but not least, user stats

		const cosXPGain = xpSystems.getCosmeticXPForCompletion({
			tier: resultObj.track.difficulty,
			isLinear: resultObj.track.isLinear,
			isBonus: resultObj.track.trackNum > 0,
			isUnique: isEntireTrack ? !playerCompletedThisTrackBefore : !playerCompletedThisZoneBefore,
			isStageIL: resultObj.replay.header.zoneNum > 0,
		});

		return UserStats.findOne({
			where: {userID: resultObj.userID},
			transaction: transaction,
		}).then(userStats => {
			if (!userStats)
				return Promise.reject(new ServerError(400, 'Bad request'));

			const currentLevel = userStats.level;
			const nextLevel = currentLevel+1;
			let gainedLevels = 0;
			let reqXP = xpSystems.getCosmeticXPForLevel(nextLevel);
			while (reqXP > -1 && userStats.cosXP + cosXPGain >= reqXP) {
				gainedLevels++;
				reqXP = xpSystems.getCosmeticXPForLevel(nextLevel + gainedLevels);
			}

			resultObj.xp.cosXP = {
				gainLvl: gainedLevels,
				oldXP: userStats.cosXP,
				gainXP: cosXPGain,
			};

			return userStats.increment({
				'totalJumps': resultObj.replay.overallStats.jumps,
				'totalStrafes': resultObj.replay.overallStats.strafes,
				'level': gainedLevels,
				'cosXP': cosXPGain,
				'runsSubmitted': 1,
				'mapsCompleted': playerCompletedMainTrackBefore ? 0 : 1,
			}, {transaction: transaction});
		});
	});
};

const Flag = Object.freeze({
	BACKWARDS: 1 << 0,
	LOW_GRAVITY: 1 << 1,
	W_KEY_ONLY: 1 << 2,
});

module.exports = {

	create: (runSession, userMdl, runFile) => {
		if (runFile.length === 0) {
			return Promise.reject(new ServerError(400, 'Bad request'));
		}

		let resultObj = {
			bin: {
				buf: runFile,
				offset: 0,
				ok: true,
			},
			track: runSession.track,
			map: runSession.track.map,
			ses: runSession,
			userID: userMdl.id,
			steamID: userMdl.steamID,
			mapRank: null,
			xp: {},
			extra: {},
		};
		return sequelize.transaction(t => {
			return validateRunSession(resultObj).then(() => {
				return validateRunFile(resultObj)
			}).then(replay => {
				resultObj.replay = replay;
				return processRunFile(resultObj);
			}).then(() => {
				return isNewPersonalBest(resultObj, t);
			}).then(isNewPB => {
				resultObj.isPersonalBest = isNewPB;
				return isNewPB ? isNewWorldRecord(resultObj, t) : Promise.resolve(false);
			}).then(isNewWR => {
				resultObj.isNewWorldRecord = isNewWR;
				return saveRun(resultObj, t);
			}).then(run => {
				return Promise.resolve({
					isNewWorldRecord: resultObj.isNewWorldRecord,
					isNewPersonalBest: resultObj.isPersonalBest,
					rank: resultObj.mapRank,
					run: run.toJSON(),
					xp: resultObj.xp,
					extra: resultObj.extra,
				});
			});
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
			order: [['ticks', 'ASC']],
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
        queryHelper.addExpansions(queryOptions, queryParams.expand, ['user', 'map', 'mapWithInfo', 'runStats', 'runZoneStats', 'rank']);
		return Run.findByPk(runID, queryOptions);
	},

	getFilePath: (runID) => {
		return Run.findByPk(runID).then(run => {
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

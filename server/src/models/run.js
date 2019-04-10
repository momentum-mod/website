'use strict';
const crypto = require('crypto'),
	{ sequelize, Op, Map, MapInfo, MapStats, Run,
		RunZoneStats, BaseStats, User, UserStats, UserMapRank,
		MapTrack, MapTrackStats, MapZone, MapZoneStats, XPSystems,
	} = require('../../config/sqlize'),
	activity = require('./activity'),
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

		const runDate = new Date(Number(replay.header.runDate_s) * 1000).getTime(); // We're good til 2038...
		const nowDate = Date.now();
		const magicLE = 0x524D4F4D;

		const b1 = resultObj.bin.ok,
			b2 = replay.magic === magicLE,
			b3 = replay.header.steamID === resultObj.playerID,
			b4 = replay.header.mapHash === resultObj.map.hash,
			b5 = replay.header.mapName === resultObj.map.name,
			b6 = replay.header.stopTick > replay.header.startTick,
			b7 = replay.header.trackNum === 0, // TODO (0.9.0) trackNum >= 0 && replay.header.trackNum < resultObj.map.info.numTracks,
			b8 = replay.header.runFlags === 0, // TODO removeme when we support runFlags (0.9.0)
			b9 = replay.header.zoneNum === 0, // TODO change to >= 0 when we support ILs (0.9.0)
			b10 = runDate <= nowDate && runDate > (nowDate - 10000);
		if (b1 && b2 && b3 && b4 && b5 && b6 && b7 && b8 && b9 && b10)
		{
			replay.header.ticks = replay.header.stopTick - replay.header.startTick;
			resolve(replay);
		}
		else {
			reject(new ServerError(400, 'Bad request'));
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
				playerID: resultObj.playerID,
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
		userID: resultObj.playerID,
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
		if (created) {
			resultObj.createdMapRank = true;
			// It's definitely a PB
			return Promise.resolve(true);
		} else {
			resultObj.createdMapRank = false;
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
		if (!resultObj.runModel.isPersonalBest)
			return Promise.resolve();

		const oldRunID = resultObj.mapRank.runID;
		return resultObj.mapRank.update({runID: run.id}, {transaction: transact}).then(() => {
			// TODO: remove this after Run.isPersonalBest is removed
			if (!resultObj.createdMapRank) {
				return Run.update({isPersonalBest: false}, {
					where: {
						id: oldRunID,
						isPersonalBest: true,
					},
					transaction: transact,
				});
			}
			else
				return Promise.resolve();
		});
	}).then(() => { // Store the run file
		return storeRunFile(resultObj, runModel.id);
	}).then(results => { // Update the download URL for the run
		return runModel.update({ file: results.downloadURL }, {transaction: transact});
	}).then(() => { // Generate PB notifications
		if (!resultObj.runModel.isPersonalBest || resultObj.isNewWorldRecord)
			return Promise.resolve();
		return activity.create({
			type: activity.ACTIVITY_TYPES.PB_ACHIEVED,
			userID: resultObj.playerID,
			data: runModel.id,
		}, transact);
	}).then(() => { // Generate WR notifications if needed
		if (!resultObj.isNewWorldRecord)
			return Promise.resolve();
		return activity.create({
			type: activity.ACTIVITY_TYPES.WR_ACHIEVED,
			userID: resultObj.playerID,
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

const getRankXP = (rank, completions, params) => {
	let rankObj = {
		rankXP: 0,
		group: {},
		formula: 0,
		top10: 0,
	};

	// Regardless of run, we want to calculate formula points
	const formulaPoints = Math.ceil(params.formula.A / (rank + params.formula.B));
	rankObj.formula = formulaPoints;
	rankObj.rankXP += formulaPoints;

	// Calculate Top10 points if in there
	if (rank < 11) {
		const top10Points = Math.ceil(params.top10.rankPercentages[rank - 1] * params.top10.WRPoints);
		rankObj.top10 = top10Points;
		rankObj.rankXP += top10Points;
	} else {
		// Otherwise we calculate group points depending on group location

		// Going to have to calculate groupSizes dynamically
		const groupSizes = [];
		for (let i = 0; i < params.groups.maxGroups; i++) {
			groupSizes[i] = Math.max(params.groups.groupScaleFactors[i] * (completions ^ params.groups.groupExponents[i]), params.groups.groupMinSizes[i]);
		}

		let rankOffset = 11;
		for (let i = 0; i < params.groups.maxGroups; i++) {
			if (rank < rankOffset + groupSizes[i]) {
				const groupPoints = Math.ceil(params.top10.WRPoints * params.groups.groupPointPcts[i]);
				rankObj.group.groupNum = i + 1;
				rankObj.group.groupPoints = groupPoints;
				rankObj.rankXP += groupPoints;
				break;
			} else {
				rankOffset += groupSizes[i];
			}
		}
	}

	return rankObj;
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
			playerID: resultObj.playerID,
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
						playerID: resultObj.playerID,
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
		// All runs have a particular track, so get that and its related stats
		return MapTrack.findOne({
			where: {
				mapID: resultObj.map.id,
				trackNum: resultObj.replay.header.trackNum,
			},
			include: [
				{
					model: MapTrackStats,
					as: 'stats',
					include: [{model: BaseStats, as: 'baseStats'}],
				},
				{
					model: MapZone,
					as: 'zones',
					include: [{model: MapZoneStats, as: 'stats', include: [{model: BaseStats, as: 'baseStats'}]}]
				}
			],
			transaction: transaction,
		});
	}).then(track => {
		if (!track)
			return Promise.reject(new ServerError(400, 'Bad request'));

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

			updates.push(track.stats.update(trackUpd8Obj, {transaction: transaction}));
			updates.push(track.stats.baseStats.update(updateBaseStats(resultObj.replay.overallStats)), {transaction: transaction});

			for (const zone of track.zones) {
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
			if (isEntireMainTrack)
			{
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
			for (const zone of track.zones) {
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
		if (resultObj.runModel.isPersonalBest) {
			const runCategory = {
				mapID: resultObj.map.id,
				gameType: resultObj.map.type,
				flags: resultObj.replay.header.runFlags,
				trackNum: resultObj.replay.header.trackNum,
				zoneNum: resultObj.replay.header.zoneNum,
			};

			// First we need overall completions for this category
			let completions = 0;
			let xpSystemParams = {};
			return UserMapRank.count({
				where: runCategory,
				transaction: transaction,
			}).then(count => {
				completions = count;
				return XPSystems.findOne({where: {id: 1}, transaction: transaction})
			}).then(systemsInfo => {
				if (!systemsInfo)
					return Promise.reject(new ServerError(400, 'No XP system data!'));
				xpSystemParams = systemsInfo;
				return Promise.resolve();
			}).then(() => {
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
				resultObj.xp.rankXP = getRankXP(count + 1, completions, xpSystemParams.rankXP);
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
							[Op.ne]: resultObj.playerID,
						},
						rank: rankSearch,
					},
					transaction: transaction,
				}).then(results => {
					const updates = [];
					for (const result of results) {
						result.rank += 1;
						result.rankXP = getRankXP(result.rank, completions, xpSystemParams.rankXP).rankXP;
						updates.push(result.save({transaction: transaction}));
					}
					return Promise.all(updates);
				})
			});
		}
		else return Promise.resolve();
	}).then(() => {
		// Last but not least, user stats
		const userStatsUpdate = {
			totalJumps: sequelize.literal('totalJumps + ' + resultObj.replay.overallStats.jumps),
			totalStrafes: sequelize.literal('totalStrafes + ' + resultObj.replay.overallStats.strafes),
			// TODO: calculate cosmetic XP for getting a (PB/WR/etc) run based on community input
			cosXP: sequelize.literal('cosXP + 75'),
			runsSubmitted: sequelize.literal('runsSubmitted + 1'),
		};
		if (!playerCompletedMainTrackBefore)
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
			xp: {},
		};
		return sequelize.transaction(t => {
			return Map.findById(mapID, {
				include: [
					{model: MapInfo, as: 'info'},
					{model: MapStats, as: 'stats', include: [{model: BaseStats, as: 'baseStats'}]}
				],
				transaction: t,
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
				return isNewPersonalBest(resultObj, t);
			}).then(isNewPB => {
				resultObj.runModel.isPersonalBest = isNewPB;
				return isNewPB ? isNewWorldRecord(resultObj, t) : Promise.resolve(false);
			}).then(isNewWR => {
				resultObj.isNewWorldRecord = isNewWR;
				return saveRun(resultObj, t);
			}).then(run => {
				return Promise.resolve({
					isNewWorldRecord: resultObj.isNewWorldRecord,
					isNewPersonalBest: run.isPersonalBest,
					run: run.toJSON(),
					xp: resultObj.xp,
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
        queryHelper.addExpansions(queryOptions, queryParams.expand, ['user', 'map', 'mapWithInfo', 'runStats', 'runZoneStats', 'rank']);
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

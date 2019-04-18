'use strict';
const {
		Op, Map, MapStats, MapInfo, RunSession, RunSessionTS, BaseStats, MapZoneStats, MapTrackStats,
		MapTrack, MapZone, sequelize
	} = require('../../config/sqlize'),
	ServerError = require('../helpers/server-error'),
	runMdl = require('./run');

module.exports = {

	createSession: (user, mapID, body) => {
		// TODO removeme in 0.9.0+ when we add support for ILs/bonuses
		// trackNum >= 0 && trackNum < resultObj.map.info.numTracks,
		if (body.trackNum !== 0 || body.zoneNum !== 0)
			return Promise.reject(new ServerError(400, 'Nice try, IL/Bonus runs are coming with 0.9.0!'));

		// First delete the existing one if we have one
		return module.exports.deleteSession(user).then(() => {
			// From the ashes, create anew, though we need to check if this map has this track/zone combo
			let zoneIncl = body.zoneNum > 0 ? [{model: MapZone, as: 'zones', where: {zoneNum: body.zoneNum}}] : [];
			return MapTrack.findOne({
				where: {
					mapID: mapID,
					trackNum: body.trackNum,
				},
				include: zoneIncl,
			}).then(track => {
				if (!track)
					return Promise.reject(new ServerError(400, 'This map does not have this track.'));
				else if (body.zoneNum > 0 && !(track.zones && track.zones.length === 1))
					return Promise.reject(new ServerError(400, 'This track does not have this zone.'));
				return RunSession.create({
					userID: user.id,
					mapTrackID: track.id,
					trackNum: body.trackNum,
					zoneNum: body.zoneNum
				});
			});
		});
	},

	updateSession: (sesID, user, body) => {
		// First check if this timestamp already exists
		return RunSession.findByPk(sesID, {
			where: {
				userID: user.id,
			}
		}).then(ses => {
			if (!ses)
				return Promise.reject(new ServerError(400, 'No session found!'));
			else if (ses.zoneNum > 0)
				return Promise.reject(new ServerError(400, 'You cannot update an IL run!'));
			return RunSessionTS.findOne({
				where: {
					sessionID: ses.id,
					zone: body.zoneNum,
				}
			}).then(ts => {
				if (ts)
					return Promise.reject(new ServerError(400, 'Timestamp already exists!'));
				else
					return RunSessionTS.create({
						sessionID: sesID,
						zone: body.zoneNum,
						tick: body.tick,
					});
			});
		})
	},

	completeSession: (req) => {
		return RunSession.findByPk(req.params.sesID, {
			where: {
				userID: req.user.id,
			},
			include: [
				{
					model: RunSessionTS,
					as: 'timestamps'
				},
				{
					model: MapTrack,
					as: 'track',
					include: [
						{
							model: Map,
							include: [
								{
									model: MapInfo,
									as: 'info',
								},
								{
									model: MapStats,
									as: 'stats',
									include: [{model: BaseStats, as: 'baseStats'}],
								}
							]
						},
						{
							model: MapTrackStats,
							as: 'stats',
							include: [{model: BaseStats, as: 'baseStats'}]
						},
						{
							model: MapZone,
							as: 'zones',
							include: [{model: MapZoneStats, as: 'stats', include: [{model: BaseStats, as: 'baseStats'}]}]
						}
					]
				},
			]
		}).then(ses => {
			if (!(ses && ses.track && ses.track.map))
				return Promise.reject(new ServerError(400, 'Bad request'));
			return ses.destroy().then(() => {
				return runMdl.create(ses, req.user, Buffer.from(req.body))
			});
		});
	},

	deleteSession: (user) => {
		return RunSession.destroy({
			where: {
				userID: user.id,
			}
		});
	},

};

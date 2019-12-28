'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	updateUser: {
		[Segments.BODY]: Joi.object().keys({
			alias: validation.user.alias,
			roles: validation.user.roles,
			bans: validation.user.bans,
			profile: Joi.object().keys({
				bio: validation.profile.bio,
			}).unknown(false),
		}).unknown(false),
	},

	createUser: {
		[Segments.BODY]: Joi.object().keys({
			alias: validation.user.alias,
		}),
	},

	mergeUsers: {
		[Segments.BODY]: Joi.object().keys({
			placeholderID: validation.user.id,
			realID: validation.user.id,
		})
	},

	updateAllUserStats: {
		[Segments.BODY]: Joi.object().keys({
			cosXP: validation.userStats.cosXP,
		}).unknown(false),
	},

	getMaps: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			submitterID: validation.user.id,
			expand: validation.queryParam.expand,
			priority: validation.queryParam.priority,
			status: validation.queryParam.status,
		}),
	},

	updateMap: {
		[Segments.BODY]: Joi.object().keys({
			statusFlag: validation.map.statusFlag,
		}).unknown(false),
	},

	getReports: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			resolved: validation.report.resolved,
		}),
	},

	updateReport: {
		[Segments.BODY]: Joi.object().keys({
			resolved: validation.report.resolved,
			resolutionMessage: validation.report.resolutionMessage,
		}).unknown(false),
	},

	updateXPSystems: {
		[Segments.BODY]: Joi.object().keys({
			rankXP: validation.xpSystems.rankXP,
			cosXP: validation.xpSystems.cosXP,
		}).unknown(false),
	},

};

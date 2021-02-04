'use strict';
const { Segments, Joi } = require('celebrate'),
	validation = require('../models/validation');

module.exports = {

	get: {
		[Segments.QUERY]: Joi.object().keys({
			mapRank: validation.map.id,
			expand: validation.queryParam.expand,
		}),
	},

	update: {
		[Segments.BODY]: Joi.object().keys({
			alias: validation.user.alias,
			profile: Joi.object().keys({
				bio: validation.profile.bio,
			}).unknown(false),
		}).unknown(false),
	},

	getMapLibrary: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
			type: validation.map.type,
		}),
	},

	getUserFavorites: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
			type: validation.map.type,
		}),
	},

	getSubmittedMaps: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
			status: validation.queryParam.status,
			type: validation.map.type,
		}),
	},

	getActivities: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			type: validation.activity.type,
			data: validation.activity.data,
			expand: validation.queryParam.expand,
		}),
	},

	getFollowedActivities: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			type: validation.activity.type,
			data: validation.activity.data,
		}),
	},

	followUser: {
		[Segments.BODY]: Joi.object().keys({
			userID: validation.user.id,
		}).unknown(false),
	},

	updateFollowStatus: {
		[Segments.BODY]: Joi.object().keys({
			notifyOn: validation.userFollow.notifyOn,
		}).unknown(false),
	},

	notifID: {
		[Segments.PARAMS]: {
			notifID: validation.notification.id,
		},
	},

	getNotifications: {
		[Segments.QUERY]: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
		}),
	},

	updateNotification: {
		[Segments.BODY]: Joi.object().keys({
			read: validation.notification.read,
		}).unknown(false),
	},

	destroySocialLink: {
		[Segments.PARAMS]: Joi.object().keys({
			type: Joi.string().valid('twitter', 'twitch', 'discord').required(),
		}),
	},

};

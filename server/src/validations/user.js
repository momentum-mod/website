'use strict';
const Joi = require('joi'),
	validation = require('../models/validation');

module.exports = {

	get: {
		query: Joi.object().keys({
			expand: validation.queryParam.expand,
		}),
	},

	update: {
		body: Joi.object().keys({
			alias: validation.user.alias,
			profile: Joi.object().keys({
				bio: validation.profile.bio,
			}).unknown(false),
		}).unknown(false),
	},

	getMapLibrary: {
		query: Joi.object().keys({
			limit: Joi.number().integer().min(0).max(20), // TODO: change this back to validation.queryParam.limit (0.9.0)
			offset: validation.queryParam.offset,
			expand: validation.queryParam.expand
		}),
	},

	getUserFavorites: {
		query: Joi.object().keys({
			limit: Joi.number().integer().min(0).max(20), // TODO: change this back to validation.queryParam.limit (0.9.0)
			offset: validation.queryParam.offset,
		}),
	},

	getSubmittedMaps: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			search: validation.queryParam.search,
			expand: validation.queryParam.expand,
		}),
	},

	getActivities: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			type: validation.activity.type,
			data: validation.activity.data,
			expand: validation.queryParam.expand,
		}),
	},

	getFollowedActivities: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
			type: validation.activity.type,
			data: validation.activity.data,
		}),
	},

	followUser: {
		body: Joi.object().keys({
			userID: validation.user.id,
		}).unknown(false),
	},

	updateFollowStatus: {
		body: Joi.object().keys({
			notifyOn: validation.userFollow.notifyOn,
		}).unknown(false),
	},

	notifID: {
		params: {
			notifID: validation.notification.id,
		},
	},

	getNotifications: {
		query: Joi.object().keys({
			limit: validation.queryParam.limit,
			offset: validation.queryParam.offset,
		}),
	},

	updateNotification: {
		body: Joi.object().keys({
			read: validation.notification.read,
		}).unknown(false),
	},

	destroySocialLink: {
		params: Joi.object().keys({
			type: Joi.string().valid('twitter', 'twitch', 'discord').required(),
		}),
	},

};

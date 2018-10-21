'use strict';
const { Op, User, Profile } = require('../../config/sqlize'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	axios = require('axios');

module.exports = {

	Permission: Object.freeze({
		MAPPER: 1 << 0,
		MODERATOR: 1 << 1,
		ADMIN: 1 << 2,
		BANNED_LEADERBOARDS: 1 << 3,
		BANNED_ALIAS: 1 << 4,
		BANNED_AVATAR: 1 << 5
	}),

	updateSteamInfo: (usr, avatarURL, alias) => {
		if ((usr.permissions & module.exports.Permission.BANNED_AVATAR) === 0)
			usr.avatarURL = avatarURL;
		if ((usr.permissions & module.exports.Permission.BANNED_ALIAS) === 0)
			usr.alias = alias;
		return usr.save();
	},

	create: (usr) => {
		return User.create({
			id: usr.id,
			profile: {
				alias: usr.alias,
				avatarURL: usr.avatarURL
			}
		}, { include: Profile });
	},

	findOrCreate: (profile) => {
		profile.alias = profile.displayName;
		profile.avatarURL = profile.photos[2].value;
		return new Promise((resolve, reject) => {
			User.find({ where: { id: profile.id }})
			.then(usr => {
				if (usr) {
					return module.exports.updateSteamInfo(usr, profile.avatarURL, profile.alias);
				} else {
					return module.exports.create(profile);
				}
			}).then(usr => {
				resolve(usr);
			}).catch(reject);
		});
	},

	get: (userID, context) => {
		const allowedExpansions = ['profile'];
		const queryContext = {
			include: [],
			where: { id: userID },
			attributes: {
				exclude: ['refreshToken']
			}
		};
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return User.find(queryContext);
	},

	getAll: (context) => {
		const queryContext = {
			include: [{
				model: Profile,
				where: {
					alias: {
						[Op.like]: '%' + (context.search || '') + '%' // 2 spooky 5 me O:
					}
				}
			}],
			attributes: {
				exclude: ['refreshToken']
			},
			offset: parseInt(context.page) || 0,
			limit: Math.min(parseInt(context.limit) || 20, 20)
		};
		if (!(context.expand && context.expand.includes('profile'))) {
			queryContext.include[0].attributes = [];
		}
		return User.findAll(queryContext);
	},

	update: (userID, usr) => {
		const updates = [
			User.update(usr, { where: { id: userID }})
		];
		if (usr.profile) {
			updates.push(
				Profile.update(usr.profile, {
					where: { userID: userID }
				})
			);
		}
		return Promise.all(updates);
	},

	getProfile: (userID) => {
		return Profile.find({
			where: { userID: userID }
		});
	},

	updateProfile: (userID, profile) => {
		return Profile.update(profile, {
			where: { userID: userID }
		});
	}

};

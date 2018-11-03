'use strict';
const { sequelize, Activity, Op, User, Profile, UserFollows } = require('../../config/sqlize'),
	activity = require('./activity'),
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
		return sequelize.transaction(t => {
			let userInfo = {};
			return User.create({
				id: usr.id,
				profile: {
					alias: usr.alias,
					avatarURL: usr.avatarURL
				}
			}, {
				include: Profile,
				transaction: t,
			}).then(user => {
				userInfo = user;
				return Activity.create({
					type: activity.ACTIVITY_TYPES.USER_JOINED,
					data: user.id,
					userID: user.id,
				}, {transaction: t});
			}).then(act => {
				return Promise.resolve(userInfo);
			});
		});
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
	},

	getFollowers: (userID) => {
		return UserFollows.findAndCountAll({
			where: { followedID: userID },
			include: [
				{
					model: User,
					include: [
						{
							model: Profile,
							as: 'profile'
						}
					]
				},
			]
		});
	},

	getFollowing: (userID) => {
		return UserFollows.findAndCountAll({
			where: { followeeID: userID },
			include: [
				{
					model: User,
					include: [
						{
							model: Profile,
							as: 'profile'
						}
					]
				},
			]
		});
	},

	isFollowingUser: (followeeID, followedID) => {
		return UserFollows.findOne({
			where: { followeeID: followeeID, followedID: followedID}
		});
	},

	followUser: (followeeID, followedID) => {
		return UserFollows.findOrCreate({
			where: { followeeID: followeeID, followedID: followedID }
		});
	},

	updateFollowStatus: (followeeID, followedID, notify) => {
		return UserFollows.update(
			{ notify: notify },
			{ where: { followeeID: followeeID, followedID: followedID } },
		);
	},

	unfollowUser: (followeeID, followedID) => {
		return UserFollows.destroy({
			where: { followedID: followedID, followeeID: followeeID }
		});
	},

};

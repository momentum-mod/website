'use strict';
const { sequelize, Op, User, Profile, UserFollows, Notification, Activity } = require('../../config/sqlize'),
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

	updateSteamInfo: (usr, newProfile) => {
		if ((usr.permissions & module.exports.Permission.BANNED_AVATAR) === 0)
			usr.profile.avatarURL = newProfile.avatarURL;
		if ((usr.permissions & module.exports.Permission.BANNED_ALIAS) === 0)
			usr.profile.alias = newProfile.alias;
		return usr.save();
	},

	create: (id, profile) => {
		return sequelize.transaction(t => {
			let userInfo = {};
			return User.create({
				id: id,
				profile: {
					alias: profile.alias,
					avatarURL: profile.avatarURL
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

	findOrCreateFromGame: (id) => {
		return axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
			params: {
				key: config.steam.webAPIKey,
				steamids: id,
			}
		}).then(sres => {
			if (sres.data.response.error)
				next(sres); // TODO parse the error
			else if (sres.data.response.players[0]) {
				const playerData = sres.data.response.players[0];
				if (id === playerData.steamid) {
					return Promise.resolve({
						id: id,
						alias: playerData.personaname,
						avatarURL: playerData.avatarfull,
					})
				}
			}
			return Promise.resolve(null);
		}).then(playerData => {
			return User.findOne({
				where: { id: id },
				include: Profile
			}).then(usr => {
				return Promise.resolve({usr: usr, playerData: playerData})
			});
		}).then((userData) => {
			if (userData.usr)
				return module.exports.updateSteamInfo(userData.usr, userData.playerData);
			else if (userData.playerData)
				return module.exports.create(id, userData.playerData);
			else
				return Promise.error(new Error('Could not find player on Steam'));
		});
	},

	findOrCreateFromWeb: (openIDProfile) => {
		let profile = {
			alias: openIDProfile.displayName,
			avatarURL: openIDProfile.photos[2].value,
		};
		return new Promise((resolve, reject) => {
			User.find({ where: { id: openIDProfile.id }, include: Profile})
			.then(usr => {
				if (usr) {
					return module.exports.updateSteamInfo(usr, profile);
				} else {
					return module.exports.create(openIDProfile.id, profile);
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
			attributes: { exclude: ['refreshToken'] },
			limit: 20
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.page && !isNaN(context.page))
			queryContext.offset = (Math.max(parseInt(context.page), 0) * queryContext.limit);
		if (!(context.expand && context.expand.includes('profile')))
			queryContext.include[0].attributes = [];
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

	checkFollowStatus: (localUserID, userToCheck) => {
		let followStatus = {
		};
		return UserFollows.findOne({
			where: { followeeID: localUserID, followedID: userToCheck}
		}).then(resp => {
			if (resp)
				followStatus.local = resp;

			return UserFollows.findOne({
				where: { followeeID: userToCheck, followedID: localUserID}
			})
		}).then(resp => {
			if (resp)
				followStatus.target = resp;

			return Promise.resolve(followStatus);
		});
	},

	followUser: (followeeID, followedID) => {
		return UserFollows.findOrCreate({
			where: { followeeID: followeeID, followedID: followedID }
		});
	},

	updateFollowStatus: (followeeID, followedID, notify) => {
		return UserFollows.update(
			{ notifyOn: notify },
			{ where: { followeeID: followeeID, followedID: followedID } },
		);
	},

	unfollowUser: (followeeID, followedID) => {
		return UserFollows.destroy({
			where: { followedID: followedID, followeeID: followeeID }
		});
	},

	getNotifications: (userID) => {
		return Notification.findAll({
			where: { forUserID: userID },
			include: {
				model: Activity,
				as: 'activity',
				include: {
					model: User,
					as: 'user',
					include: {
						model: Profile,
						as: 'profile',
					}
				}
			}
		});
	},

	updateNotification: (userID, notifID, read) => {
		return Notification.update(
			{ read: read },
			{ where: { id: notifID, forUserID: userID }}
		);
	},

	deleteNotification: (userID, notifID) => {
		return Notification.destroy({
			where: { id: notifID, forUserID: userID }
		});

	},

	getFollowedActivities: (userID, context) => {
		const queryContext = {
			where: {},
			include: [{
				model: User,
				attributes: { exclude: ['refreshToken']},
				include: [{
					model: Profile,
				}, {
					model: UserFollows,
					where: { followeeID: userID },
					attributes: [],
				}]
			}],
			limit: 10,
			order: [['createdAt', 'DESC']],
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.page && !isNaN(context.page))
			queryContext.offset = (Math.max(parseInt(context.page), 0) * queryContext.limit);
		if (context.data)
			queryContext.where.data = context.data;
		if (context.type)
			queryContext.where.type = context.type;
		return Activity.findAll(queryContext);
	}

};

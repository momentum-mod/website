'use strict';
const { sequelize, Op, User, UserAuth, UserStats, Profile, UserFollows, Notification, Activity,
	DiscordAuth, TwitchAuth, TwitterAuth, Map } = require('../../config/sqlize'),
	activity = require('./activity'),
	OAuth = require('oauth'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	axios = require('axios');

module.exports = {

	Permission: Object.freeze({
		VERIFIED: 1 << 0,
		MAPPER: 1 << 1,
		MODERATOR: 1 << 2,
		ADMIN: 1 << 3,
		BANNED_LEADERBOARDS: 1 << 4,
		BANNED_ALIAS: 1 << 5,
		BANNED_AVATAR: 1 << 6,
		BANNED_BIO: 1 << 7,
	}),

	updateSteamInfo: (usr, newProfile) => {
		if (newProfile.country && usr.country !== newProfile.country)
			usr.country = newProfile.country;
		if ((usr.permissions & module.exports.Permission.BANNED_AVATAR) === 0)
			usr.profile.avatarURL = newProfile.avatarURL;
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
				},
				country: profile.country,
				auth: { userID: id },
				stats: { userID: id }
			}, {
				include: [
					{ model: Profile },
					{ model: UserAuth, as: 'auth' },
					{ model: UserStats, as: 'stats' }
				],
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
						country: playerData.loccountrycode,
						alias: playerData.personaname,
						avatarURL: playerData.avatarfull,
					})
				}
			}
			return Promise.resolve(null);
		}).then(playerData => {
			return User.findById(id, {
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
				return Promise.reject(new Error('Could not find player on Steam'));
		});
	},

	findOrCreateFromWeb: (openIDProfile) => {
		let profile = {
			alias: openIDProfile.displayName,
			avatarURL: openIDProfile.photos[2].value,
			country: openIDProfile._json.loccountrycode,
		};
		return new Promise((resolve, reject) => {
			User.findById(openIDProfile.id, {include: Profile})
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
		const allowedExpansions = ['profile', 'userStats'];
		const queryContext = {
			include: [],
			where: { id: userID },
		};
		queryHelper.addExpansions(queryContext, context.expand, allowedExpansions);
		return User.find(queryContext);
	},

	getAll: (context) => {
		const queryContext = {
			include: [{
				model: Profile,
				where: {
					alias: {[Op.like]: '%' + (context.search || '') + '%'}
				}
			}],
			limit: 20
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (!(context.expand && context.expand.includes('profile')))
			queryContext.include[0].attributes = [];
		return User.findAndCountAll(queryContext);
	},

	update: (powerUser, userID, usr) => {
		return User.findById(userID).then(foundUsr => {
			if (foundUsr) {
				const foundUsrAdmin = (foundUsr.permissions & module.exports.Permission.ADMIN) !== 0;
				const foundUsrMod = (foundUsr.permissions & module.exports.Permission.MODERATOR) !== 0;
				// Moderators are limited in what they can update
				if (powerUser.permissions & module.exports.Permission.MODERATOR) {
					if ((foundUsrAdmin || foundUsrMod) && (powerUser.id !== foundUsr.id)) {
						const err = new Error('Cannot update user with >= power to you');
						err.status = 403;
						return Promise.reject(err);
					} else {
						// Hard cap their permission to what they have by ensuring it won't be erased
						usr.permissions |= ((foundUsrAdmin ? module.exports.Permission.ADMIN : 0) |
							(foundUsrMod ? module.exports.Permission.MODERATOR : 0));
					}
				} else if (foundUsrAdmin && powerUser.id !== foundUsr.id) {
					const err = new Error('Cannot update other admins');
					err.status = 403;
					return Promise.reject(err);
				}

				// Only allow updating permissions (it's also the only field that really can be)
				const usrUpd8 = {
					permissions: usr.permissions
				};

				const updates = [
					foundUsr.update(usrUpd8)
				];
				if (usr.profile) {
					updates.push(module.exports.updateProfile(foundUsr.id, usr.profile));
				}
				return Promise.all(updates);
			} else {
				const err = new Error('User not found');
				err.status = 404;
				return Promise.reject(err);
			}
		});
	},

	getProfile: (userID) => {
		return Profile.find({
			where: { userID: userID },
			include: [
				{
					model: DiscordAuth,
					attributes: {
						exclude: ['accessToken', 'refreshToken']
					}
				},
				{
					model: TwitterAuth,
					attributes: {
						exclude: ['oauthKey', 'oauthSecret'],
					},
				},
				{
					model: TwitchAuth,
					attributes: {
						exclude: ['token']
					}
				},
			]
		});
	},

	updateProfile: (userID, profile) => {
		// Only allow updating certain things
		const profUpd8 = {
			alias: profile.alias,
			bio: profile.bio,
		};
		return Profile.update(profUpd8, {
			where: { userID: userID }
		});
	},

	createSocialLink: (profile, type, authData) => {
		if (type) {
			let model = null;
			switch (type) {
				case 'twitter':
					model = TwitterAuth;
					break;
				case 'twitch':
					model = TwitchAuth;
					break;
				case 'discord':
					model = DiscordAuth;
					break;
				default:
					break;
			}
			if (model) {
				return model.findOrCreate({
					where: { profileID: profile.id },
					defaults: authData,
				}).spread((authMdl, created) => {
					return Promise.resolve(authMdl);
				})
			} else {
				const err = new Error('Unsupported social link type');
				err.status = 400;
				return Promise.reject(err);
			}
		} else {
			const err = new Error('Bad request');
			err.status = 400;
			return Promise.reject(err);
		}
	},

	destroyTwitterLink: (profile) => {
		return TwitterAuth.findOne({
			where: { profileID: profile.id }
		}).then(mdl => {
			if (mdl) {
				return new Promise((res, rej) => {
					let oauth = new OAuth.OAuth(
						'https://api.twitter.com/oauth/request_token',
						'https://api.twitter.com/oauth/access_token',
						config.twitter.consumerKey,
						config.twitter.consumerSecret,
						'1.0A',
						null,
						'HMAC-SHA1');
					oauth.post(
						`https://api.twitter.com/1.1/oauth/invalidate_token.json?access_token=${mdl.oauthKey}&access_token_secret=${mdl.oauthSecret}`,
						mdl.oauthKey,
						mdl.oauthSecret,
						null,
						null,
						(err, data, response) => {
							if (err)
								rej(err);
							else
								res(mdl);
						});
				});
			} else {
				const err = new Error('Failed to destroy twitter auth, none currently stored!');
				err.status = 400;
				return Promise.reject(err);
			}
		}).then(mdl => {
			return TwitterAuth.destroy({
				where: {id: mdl.id}
			});
		});
	},

	destroyTwitchLink: (profile) => {
		return TwitchAuth.findOne({
			where: { profileID: profile.id }
		}).then(mdl => {
			if (mdl) {
				return axios.post('https://id.twitch.tv/oauth2/revoke', `token=${mdl.token}&token_type_hint=refresh_token`, {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Client-ID': config.twitch.clientID,
					}
				}).then(sres => {
					if (sres.status === 200)
						return Promise.resolve(mdl);
					else
						return Promise.reject();
				})
			} else {
				const err = new Error('Failed to destroy twitch auth, none currently stored!');
				err.status = 400;
				return Promise.reject(err);
			}
		}).then(mdl => {
			return TwitchAuth.destroy({
				where: {id: mdl.id}
			});
		});
	},

	destroyDiscordLink: (profile) => {
		return DiscordAuth.findOne({
			where: {profileID: profile.id}
		}).then(mdl => {
			if (mdl) {
				return axios.post('https://discordapp.com/api/oauth2/token/revoke', `token=${mdl.refreshToken}&token_type_hint=refresh_token`, {
					headers: {
						'Authorization': 'Bearer ' + mdl.accessToken,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}).then(sres => {
					if (sres.status === 200)
						return Promise.resolve(mdl);
					else
						return Promise.reject();
				})
			} else {
				const err = new Error('Failed to destroy discord auth, none currently stored!');
				err.status = 400;
				return Promise.reject(err);
			}
		}).then(mdl => {
			return DiscordAuth.destroy({
				where: {id: mdl.id}
			});
		});
	},

	destroySocialLink: (profile, type) => {
		if (type === 'twitter')
			return module.exports.destroyTwitterLink(profile);
		else if (type === 'twitch')
			return module.exports.destroyTwitchLink(profile);
		else if (type === 'discord')
			return module.exports.destroyDiscordLink(profile);
		else
			return Promise.reject(); // TODO make an error here
	},

	getFollowers: (userID) => {
		return UserFollows.findAndCountAll({
			where: { followedID: userID },
			include: [
				{
					model: User,
					as: 'followed',
					include: [
						{
							model: Profile,
							as: 'profile'
						}
					]
				},
				{
					model: User,
					as: 'followee',
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
					as: 'followed',
					include: [
						{
							model: Profile,
							as: 'profile'
						}
					]
				},
				{
					model: User,
					as: 'followee',
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
		return User.findById(followedID).then(user => {
			if (!user) {
				const err = new Error('User not found');
				err.status = 404;
				return Promise.reject(err);
			}
			return UserFollows.findOrCreate({
				where: { followeeID: followeeID, followedID: followedID }
			});
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

	getNotifications: (userID, context) => {
		const queryContext = {
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
			},
			limit: 10,
			order: [['createdAt', 'DESC']],
		};
		if (context.limit && !isNaN(context.limit))
			queryContext.limit = Math.min(Math.max(parseInt(context.limit), 1), 20);
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		return Notification.findAndCountAll(queryContext);
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
		if (context.offset && !isNaN(context.offset))
			queryContext.offset = Math.min(Math.max(parseInt(context.offset), 0), 5000);
		if (context.data)
			queryContext.where.data = context.data;
		if (context.type)
			queryContext.where.type = context.type;
		return Activity.findAll(queryContext);
	},

	getSubmittedMapSummary: (userID) => {
		return Map.findAll({
			where: { submitterID: userID },
			group: ['statusFlag'],
			attributes: ['statusFlag', [sequelize.fn('COUNT', 'statusFlag'), 'statusCount']],
		});
	},

	getSteamFriendIDs: (steamID) => {
		return axios.get('https://api.steampowered.com/ISteamUser/GetFriendList/v1/', {
			params: {
				key: config.steam.webAPIKey,
				steamid: steamID,
			}
		}).then(res => {
			return new Promise((resolve, reject) => {
				if (res && res.data) {
					const friendIDs = [];
					for (let i = 0; i < res.data.friendslist.friends.length; i++)
						friendIDs.push(res.data.friendslist.friends[i].steamid);
					resolve(friendIDs);
				} else {
					const err = new Error('Failed to get Steam friends list');
					err.status = 500;
					reject(err);
				}
			});
		});
	},

};

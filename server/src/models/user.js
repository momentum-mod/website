'use strict';
const {
		sequelize, Op, User, UserAuth, UserStats, Profile, UserFollows, Notification, Activity,
		DiscordAuth, TwitchAuth, TwitterAuth, Map, UserMapRank, Run
	} = require('../../config/sqlize'),
	activity = require('./activity'),
	OAuth = require('oauth'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	ServerError = require('../helpers/server-error'),
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
			usr.avatarURL = newProfile.avatarURL;
		return usr.save();
	},

	create: (id, profile) => {
		return sequelize.transaction(t => {
			let userInfo = {};
			return User.create({
				id: id,
				alias: profile.alias,
				avatarURL: profile.avatarURL,
				country: profile.country,
				profile: {},
				auth: {userID: id},
				stats: {userID: id}
			}, {
				include: [
					Profile,
					{model: UserAuth, as: 'auth'},
					{model: UserStats, as: 'stats'},
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
		}).then(userData => {
			if (userData.usr)
				return module.exports.updateSteamInfo(userData.usr, userData.playerData);
			else if (userData.playerData)
				return module.exports.create(id, userData.playerData);
			else
				return Promise.reject(new ServerError(500, 'Could not find player on Steam'));
		});
	},

	findOrCreateFromWeb: (openIDProfile) => {
		let profile = {
			alias: openIDProfile.displayName,
			avatarURL: openIDProfile.photos[2].value,
			country: openIDProfile._json.loccountrycode,
		};
		return new Promise((resolve, reject) => {
			User.findById(openIDProfile.id, {include: Profile}).then(usr => {
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

	get: (userID, queryParams) => {
		const allowedExpansions = ['profile', 'userStats'];
		const queryOptions = {
			include: [],
			where: {id: userID},
		};
		if (queryParams.mapRank && !isNaN(queryParams.mapRank)) {
			queryOptions.include.push({
				model: UserMapRank,
				as: 'mapRank',
				where: { mapID: queryParams.mapRank },
				include: [Run],
				required: false,
			})
		}
		queryHelper.addExpansions(queryOptions, queryParams.expand, allowedExpansions);
		return User.findOne(queryOptions);
	},

	getAll: (queryParams) => {
		const queryOptions = {
			where: {},
			include: [],
			limit: 20
		};
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.search)
			queryOptions.where.alias = {[Op.like]: '%' + (queryParams.search || '') + '%'};
		if (queryParams.expand) {
			const expansions = queryParams.expand.split(',');
			if (expansions.includes('profile'))
				queryOptions.include.push({model: Profile});
		}
		return User.findAndCountAll(queryOptions);
	},

	updateAsLocal: (locUsr, body) => {
		return sequelize.transaction(t => {

			// Only allow updating certain things
			const usrUpd8 = {
				profile: {},
			};

			if ((locUsr.permissions & module.exports.Permission.BANNED_ALIAS) === 0)
				usrUpd8.alias = body.alias;

			return User.update(usrUpd8, {where: {id: locUsr.id}, transaction: t}).then(() => {
				if (body.profile)
					return module.exports.updateProfile(locUsr, false, body.profile, t);
			});
		});
	},

	updateAsAdmin: (powerUser, userID, usr) => {
		return User.findById(userID).then(foundUsr => {
			if (foundUsr) {
				const foundUsrAdmin = (foundUsr.permissions & module.exports.Permission.ADMIN) !== 0;
				const foundUsrMod = (foundUsr.permissions & module.exports.Permission.MODERATOR) !== 0;
				// Moderators are limited in what they can update
				if (powerUser.permissions & module.exports.Permission.MODERATOR) {
					if ((foundUsrAdmin || foundUsrMod) && (powerUser.id !== foundUsr.id)) {
						return Promise.reject(new ServerError(403, 'Cannot update user with >= power to you'));
					} else {
						// Hard cap their permission to what they have by ensuring it won't be erased
						usr.permissions |= ((foundUsrAdmin ? module.exports.Permission.ADMIN : 0) |
							(foundUsrMod ? module.exports.Permission.MODERATOR : 0));
					}
				} else if (foundUsrAdmin && powerUser.id !== foundUsr.id) {
					return Promise.reject(new ServerError(403, 'Cannot update other admins'));
				}

				// Only allow updating alias & permissions
				const usrUpd8 = {
					permissions: usr.permissions,
					alias: usr.alias,
				};

				const updates = [
					foundUsr.update(usrUpd8)
				];
				if (usr.profile) {
					updates.push(module.exports.updateProfile(foundUsr, true, usr.profile));
				}
				return Promise.all(updates);
			} else {
				return Promise.reject(new ServerError(404, 'User not found'));
			}
		});
	},

	getProfile: (userID) => {
		return Profile.find({
			where: {userID: userID},
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

	updateProfile: (userBeingUpdated, asAdmin, profile, transaction) => {
		const profUpd8 = {};
		// Only allow updating certain things
		if (!asAdmin && (userBeingUpdated.permissions & module.exports.Permission.BANNED_BIO) === 0)
			profUpd8.bio = profile.bio;

		const opts = {
			where: {userID: userBeingUpdated.id}
		};
		if (transaction)
			opts.transaction = transaction;

		return Profile.update(profUpd8, opts);
	},

	createSocialLink: (profile, type, authData) => {
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
		return model.findOrCreate({
			where: {profileID: profile.id},
			defaults: authData,
		}).spread((authMdl, created) => {
			return Promise.resolve(authMdl);
		});
	},

	destroyTwitterLink: (profile) => {
		return TwitterAuth.findOne({
			where: {profileID: profile.id},
			raw: true,
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
				return Promise.reject(new ServerError(400, 'Failed to destroy twitter auth, none currently stored!'));
			}
		}).then(mdl => {
			return TwitterAuth.destroy({
				where: {id: mdl.id}
			});
		});
	},

	destroyTwitchLink: (profile) => {
		return TwitchAuth.findOne({
			where: {profileID: profile.id},
			raw: true,
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
				return Promise.reject(new ServerError(400, 'Failed to destroy twitch auth, none currently stored!'));
			}
		}).then(mdl => {
			return TwitchAuth.destroy({
				where: {id: mdl.id}
			});
		});
	},

	destroyDiscordLink: (profile) => {
		return DiscordAuth.findOne({
			where: {profileID: profile.id},
			raw: true,
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
				return Promise.reject(new ServerError(400, 'Failed to destroy discord auth, none currently stored!'));
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
	},

	getFollowers: (userID) => {
		return UserFollows.findAndCountAll({
			where: {followedID: userID},
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
			where: {followeeID: userID},
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
		let followStatus = {};
		return UserFollows.findOne({
			where: {followeeID: localUserID, followedID: userToCheck},
			raw: true,
		}).then(resp => {
			if (resp)
				followStatus.local = resp;

			return UserFollows.findOne({
				where: {followeeID: userToCheck, followedID: localUserID},
				raw: true,
			})
		}).then(resp => {
			if (resp)
				followStatus.target = resp;

			return Promise.resolve(followStatus);
		});
	},

	followUser: (followeeID, followedID) => {
		return User.findById(followedID).then(user => {
			if (!user)
				return Promise.reject(new ServerError(404, 'User not found'));
			return UserFollows.findOrCreate({
				where: {followeeID: followeeID, followedID: followedID},
				raw: true,
			});
		});
	},

	updateFollowStatus: (followeeID, followedID, notify) => {
		return UserFollows.update(
			{notifyOn: notify},
			{where: {followeeID: followeeID, followedID: followedID}},
		);
	},

	unfollowUser: (followeeID, followedID) => {
		return UserFollows.destroy({
			where: {followedID: followedID, followeeID: followeeID}
		});
	},

	getNotifications: (userID, queryParams) => {
		const queryOptions = {
			where: {forUserID: userID},
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
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		return Notification.findAndCountAll(queryOptions);
	},

	updateNotification: (userID, notifID, read) => {
		return Notification.update(
			{read: read},
			{where: {id: notifID, forUserID: userID}}
		);
	},

	deleteNotification: (userID, notifID) => {
		return Notification.destroy({
			where: {id: notifID, forUserID: userID}
		});

	},

	getFollowedActivities: (userID, queryParams) => {
		const queryOptions = {
			where: {},
			include: [{
				model: User,
				include: [{
					model: Profile,
				}, {
					model: UserFollows,
					where: {followeeID: userID},
					attributes: [],
				}]
			}],
			limit: 10,
			order: [['createdAt', 'DESC']],
		};
		if (queryParams.limit)
			queryOptions.limit = queryParams.limit;
		if (queryParams.offset)
			queryOptions.offset = queryParams.offset;
		if (queryParams.data)
			queryOptions.where.data = queryParams.data;
		if (queryParams.type)
			queryOptions.where.type = queryParams.type;
		return Activity.findAll(queryOptions);
	},

	getSubmittedMapSummary: (userID) => {
		return Map.findAll({
			where: {submitterID: userID},
			group: ['statusFlag'],
			attributes: ['statusFlag', [sequelize.fn('COUNT', 'statusFlag'), 'statusCount']],
			raw: true,
		});
	},

	getSteamFriendIDs: (steamID) => {
		return axios.get('https://api.steampowered.com/ISteamUser/GetFriendList/v1/', {
			params: {
				key: config.steam.webAPIKey,
				steamid: steamID,
				relationship: 'friend',
			}
		}).then(res => {
			return new Promise((resolve, reject) => {
				if (res) {
					if (res.status === 401) {
						// Their profile/friends list is private, let them know
						reject(new ServerError('Friends list or profile is private'));
					} else if (res.data) {
						const friendIDs = [];
						for (let i = 0; i < res.data.friendslist.friends.length; i++)
							friendIDs.push(res.data.friendslist.friends[i].steamid);
						if (friendIDs.length > 0)
							resolve(friendIDs);
						else {
							// They don't have any friends :(
							reject(new ServerError(418, 'No friends detected :(')); // I'm a little teapot~
						}
					}
				} else {
					reject(new ServerError(500, 'Failed to get Steam friends list'));
				}
			});
		});
	},

};

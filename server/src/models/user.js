'use strict';
const {
		sequelize, Op, User, UserAuth, UserStats, Profile, UserFollows, MapCredit, Notification, Activity,
		DiscordAuth, TwitchAuth, TwitterAuth, Map, UserMapRank, Run
	} = require('../../config/sqlize'),
	activity = require('./activity'),
	OAuth = require('oauth'),
	config = require('../../config/config'),
	queryHelper = require('../helpers/query'),
	ServerError = require('../helpers/server-error'),
	xml2js = require('xml2js').parseString,
	axios = require('axios');

module.exports = {

	Role: Object.freeze({
		VERIFIED: 1 << 0,
		MAPPER: 1 << 1,
		MODERATOR: 1 << 2,
		ADMIN: 1 << 3,
		PLACEHOLDER: 1 << 4,
	}),

	Ban: Object.freeze({
		BANNED_LEADERBOARDS: 1 << 0,
		BANNED_ALIAS: 1 << 1,
		BANNED_AVATAR: 1 << 2,
		BANNED_BIO: 1 << 3,
	}),

	updateSteamInfo: (usr, newProfile) => {
		if (newProfile.country && usr.country !== newProfile.country)
			usr.country = newProfile.country;
		if ((usr.bans & module.exports.Ban.BANNED_AVATAR) === 0)
			usr.avatarURL = newProfile.avatarURL;
		if ((usr.bans & module.exports.Ban.BANNED_ALIAS) === 0 && !usr.aliasLocked)
			usr.alias = newProfile.alias;
		return usr.save();
	},

	createPlaceholder: (alias) => {
		return User.create({
			alias: alias,
			roles: module.exports.Role.PLACEHOLDER,
			profile: {},
		}, {
			include: [
				Profile,
			]
		});
	},

	mergeUsers: (body) => {
		return sequelize.transaction(t => {
			// First find both users
			let placeholderUser = null, realUser = null;
			return User.findByPk(body.placeholderID, {
				transaction: t
			}).then(placeholder => {
				if (!placeholder)
					return Promise.reject(new ServerError(400, 'Placeholder user not found!'));
				else if ((placeholder.roles & module.exports.Role.PLACEHOLDER) === 0)
					return Promise.reject(new ServerError(400, 'placeholderID does not represent a placeholder user!'));

				placeholderUser = placeholder;
				return User.findByPk(body.realID, {
					include: [{
						model: User,
						as: 'followers',
						include: [{
							model: User,
							as: 'following',
							where: {
								id: placeholder.id,
							}
						}]
					}],
					transaction: t,
				});
			}).then(real => {
				if (!real)
					return Promise.reject(new ServerError(400, 'Merging into user not found!'));
				realUser = real;

				// Can't merge the same user to itself
				if (placeholderUser.id === realUser.id)
					return Promise.reject(new ServerError(400, 'Merging the same account is not allowed!'));

				// First we want to update the credits we're featured in to point to the new ID
				return MapCredit.update({userID: realUser.id}, {
					where: {
						userID: placeholderUser.id,
					},
					transaction: t,
				});
			}).then(() => {
				// Follows
				// First edge case: delete the follow entry if the realUser is following the placeholder (can't follow yourself)
				return UserFollows.destroy({
					where: {
						followedID: placeholderUser.id,
						followeeID: realUser.id,
					},
					transaction: t,
				}).then(() => {
					// Second edge case: user(s) is (are) following both placeholder and real user
					if (realUser.followers && realUser.followers.length > 0) {
						const updates = [];
						for (const u of realUser.followers) {
							updates.push(UserFollows.findAll({
								attributes: ['followedID', 'followeeID', 'createdAt', 'notifyOn'],
								where: {
									followeeID: u.id,
									followedID: {
										[Op.or]: [
											{[Op.eq]: placeholderUser.id},
											{[Op.eq]: realUser.id},
										]
									}
								},
								transaction: t,
							}).then(follows => {
								if (!follows || follows.length !== 2)
									return Promise.reject(new ServerError(400, 'User somehow not following both!'));

								let realFollow = follows.find(val => val.followedID === realUser.id);
								let placeholderFollow = follows.find(val => val.followedID === placeholderUser.id);
								let notifyOn = (realFollow.notifyOn | placeholderFollow.notifyOn);
								if (realFollow.createdAt.getTime() < placeholderFollow.createdAt.getTime()) {
									return placeholderFollow.destroy({transaction: t}).then(() => {
										return realFollow.update({notifyOn: notifyOn}, {transaction: t})
									});
								} else {
									return realFollow.destroy({transaction: t}).then(() => {
										return placeholderFollow.update({notifyOn: notifyOn}, {transaction: t});
									});
								}
							}));
						}
						return Promise.all(updates);
					}
					return Promise.resolve();
				}).then(() => {
					// Now we update all of the user follows where we are the followed user
					return UserFollows.update({followedID: realUser.id}, {
						where: {
							followedID: placeholderUser.id,
						},
						transaction: t,
					});
				});
			}).then(() => {
				// Next up, activities
				return Activity.update({userID: realUser.id}, {
					where: {
						userID: placeholderUser.id,
					},
					transaction: t,
				});
			}).then(() => {
				// Lastly, delete our placeholder user
				return placeholderUser.destroy({
					transaction: t,
				});
			});
		});
	},

	destroyUser: (id) => {
		return User.destroy({
			where: {
				id: id,
			}
		}); // TODO clean up activities with this user?
	},

	create: (steamID, profile) => {
		return sequelize.transaction(t => {
			let userInfo = {};
			return User.create({
				steamID: steamID,
				alias: profile.alias,
				avatarURL: profile.avatarURL,
				country: profile.country,
				profile: {},
				auth: {},
				stats: {},
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

	findOrCreateFromGame: (steamID) => {
		const data = {
			summaries: {},
			xmlData: {},
		};
		const requests = [
			axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
				params: {
					key: config.steam.webAPIKey,
					steamids: steamID,
				}
			}).then(res => {
				if (res.data.response.error)
					return Promise.reject(new ServerError(500, 'Failed to get player summaries.'));
				if (res.data.response.players[0]) {
					data.summaries = res.data.response.players[0];
					return Promise.resolve();
				}
				return Promise.reject(new ServerError(500, 'Failed to get player summary.'));
			}),
			axios.get(`https://steamcommunity.com/profiles/${steamID}?xml=1`).then(res => {
				xml2js(res.data, (err, profile) => {
					if (err)
						return Promise.reject(err);

					data.xmlData = profile;
					return Promise.resolve();
				});
			})
		];

		return Promise.all(requests).then(() => {
			if (data.summaries.profilestate !== 1)
				return Promise.reject(new ServerError(403, 'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'));
			if (config.steam.preventLimited && data.xmlData.profile.isLimitedAccount[0] === '1')
				return Promise.reject(new ServerError(403, 'We do not authenticate limited Steam accounts. Buy something on Steam first!'));
			if (steamID !== data.summaries.steamid)
				return Promise.reject(new ServerError(400, 'User fetched is not the authenticated user!'));

			return Promise.resolve({
				steamID: steamID,
				country: data.summaries.locccountrycode,
				alias: data.summaries.personaname,
				avatarURL: data.summaries.avatarfull,
			})
		}).then(playerData => {
			return User.findOne({
				where: {steamID: steamID},
				include: Profile
			}).then(usr => {
				return Promise.resolve({usr: usr, playerData: playerData})
			});
		}).then(userData => {
			if (userData.usr)
				return module.exports.updateSteamInfo(userData.usr, userData.playerData);
			else if (userData.playerData)
				return module.exports.create(steamID, userData.playerData);
			else
				return Promise.reject(new ServerError(500, 'Could not find player on Steam'));
		});
	},

	findOrCreateFromWeb: (openIDProfile) => {
		const profile = {
			alias: openIDProfile.alias,
			avatarURL: openIDProfile.avatarURL,
			country: openIDProfile.country,
		};
		return User.findOne({where: {steamID: openIDProfile.id}, include: Profile}).then(usr => {
			if (usr) {
				return module.exports.updateSteamInfo(usr, profile);
			} else {
				return module.exports.create(openIDProfile.id, profile);
			}
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
				attributes: ['rank', 'rankXP'],
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
		if (queryParams.playerID) {
			queryOptions.limit = 1;
			queryOptions.where.steamID = queryParams.playerID;
		}
		if (queryParams.playerIDs)
			queryOptions.where.steamID = {[Op.in]: queryParams.playerIDs.split(',')};
		if (queryParams.search)
			queryOptions.where.alias = {[Op.like]: '%' + (queryParams.search || '') + '%'};
		if (queryParams.mapRank && !isNaN(queryParams.mapRank)) {
			queryOptions.include.push({
				model: UserMapRank,
				as: 'mapRank',
				where: { mapID: queryParams.mapRank },
				include: [Run],
				required: false,
			});
		}
		if (queryParams.expand) {
			const expansions = queryParams.expand.split(',');
			if (expansions.includes('profile'))
				queryOptions.include.push({model: Profile});
			if (expansions.includes('userStats'))
				queryOptions.include.push({model: UserStats, as: 'stats'});
		}
		return User.findAndCountAll(queryOptions);
	},

	updateUserAlias: (usrMdl, aliasToUse, updateObj) => {
		if (!aliasToUse || aliasToUse === '') {
			return module.exports.getSteamUsers([usrMdl.steamID]).then(users => {
				if (users.length > 0) {
					updateObj.alias = users[0].personaname;
					updateObj.aliasLocked = false;
				}
				return Promise.resolve(updateObj);
			});
		} else {
			updateObj.alias = aliasToUse;
			if ((usrMdl.roles & module.exports.Role.PLACEHOLDER) === 0)
				updateObj.aliasLocked = usrMdl.alias !== aliasToUse;
		}
		return Promise.resolve(updateObj);
	},

	updateAsLocal: (locUsr, body) => {
		const usrUpd8 = { profile: {} };
		return sequelize.transaction(t => {
			let userModel;
			return User.findByPk(locUsr.id, {
				transaction: t,
			}).then(user => {
				userModel = user;
				if ((locUsr.bans & module.exports.Ban.BANNED_ALIAS) !== 0)
					delete body.alias;
                return module.exports.updateUserAlias(locUsr, body.alias, usrUpd8);
			}).then(() => {
				return userModel.update(usrUpd8, {transaction: t}).then(() => {
					if (body.profile)
						return module.exports.updateProfile(locUsr, body.profile, t);
				});
			});
		});
	},

	updateAsAdmin: (powerUser, userID, usr) => {
		return User.findByPk(userID).then(foundUsr => {
			if (foundUsr) {
				const foundUsrAdmin = (foundUsr.roles & module.exports.Role.ADMIN) !== 0;
				const foundUsrMod = (foundUsr.roles & module.exports.Role.MODERATOR) !== 0;
				// Moderators are limited in what they can update
				if ((powerUser.roles & module.exports.Role.MODERATOR) !== 0) {
					if ((foundUsrAdmin || foundUsrMod) && (powerUser.id !== foundUsr.id)) {
						return Promise.reject(new ServerError(403, 'Cannot update user with >= power to you'));
					} else {
						// Hard cap their permission to what they have by ensuring it won't be erased
						usr.roles |= ((foundUsrAdmin ? module.exports.Role.ADMIN : 0) |
							(foundUsrMod ? module.exports.Role.MODERATOR : 0));
					}
				} else if (foundUsrAdmin && powerUser.id !== foundUsr.id) {
					return Promise.reject(new ServerError(403, 'Cannot update other admins'));
				}

				const updates = [];
				if (usr.alias && usr.alias !== foundUsr.alias)
					updates.push(module.exports.updateUserAlias(foundUsr, usr.alias, usr).then(() => foundUsr.update(usr)));
				else
					updates.push(foundUsr.update(usr));

				if (usr.profile) {
					updates.push(module.exports.updateProfile(foundUsr, usr.profile));
				}
				return Promise.all(updates);
			} else {
				return Promise.reject(new ServerError(404, 'User not found'));
			}
		});
	},

	getProfile: (userID) => {
		return Profile.findOne({
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

	updateProfile: (userBeingUpdated, profile, transaction) => {
		if (profile.bio && (userBeingUpdated.bans & module.exports.Ban.BANNED_BIO) !== 0)
			delete profile.bio;
		const opts = {
			where: {userID: userBeingUpdated.id}
		};
		if (transaction)
			opts.transaction = transaction;

		return Profile.update(profile, opts);
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
				return Promise.reject(new ServerError(400, 'Invalid social type!'));
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
					include: [Profile]
				},
				{
					model: User,
					as: 'followee',
					include: [Profile]
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
					include: [Profile]
				},
				{
					model: User,
					as: 'followee',
					include: [Profile]
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
		return User.findByPk(followedID).then(user => {
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
				include: [
					Profile,
					{
						model: User,
						as: 'followers',
						where: {
							id: userID,
						},
						attributes: [],
						/*through: {
							where: {followeeID: userID},
						},*/
					}
				]
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

	getSteamUsers: (steamIDs) => {
		return axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
			params: {
				key: config.steam.webAPIKey,
				steamids: steamIDs.join(','),
			}
		}).then(res => {
			if (res.data && res.data.response && res.data.response.players)
                return Promise.resolve(res.data.response.players);
			return Promise.reject(new ServerError(500, 'Failed to get user(s) from Steam'));
		});
	},

	getSteamFriendIDs: (steamID) => {
		return axios.get(`https://api.steampowered.com/ISteamUser/GetFriendList/v1/`, {
			params: {
				key: config.steam.webAPIKey,
				steamid: steamID,
				relationship: 'friend',
			}
		}).then(res => {
			if (res.data) {
				const friendIDs = [];
				for (let i = 0; i < res.data.friendslist.friends.length; i++)
					friendIDs.push(res.data.friendslist.friends[i].steamid);

				if (friendIDs.length === 0) {
					// They don't have any friends :(
					return Promise.reject(new ServerError(418, 'No friends detected :(')); // I'm a little teapot~
				}

				return Promise.resolve(friendIDs);
			}
			return Promise.reject(new ServerError(500, 'Failed to get Steam friends list'));
		}).catch(error => {
			if (error.response) {
				// The request was made and the server responded with a status code
				// that falls out of the range of 2xx
				if (error.response.status === 401)
					return Promise.reject(new ServerError(409, 'Friends list or profile is private'));
				else
					return Promise.reject(new ServerError(400, 'Bad request'));
			} else if (error.request) {
				// The request was made but no response was received
				return Promise.reject(new ServerError(404, 'Steam servers did not give a response :('));
			} else {
				// Something happened in setting up the request that triggered an Error
				return Promise.reject(error);
			}
		});
	},

};

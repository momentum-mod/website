'use strict';
const { User } = require('../../config/sqlize'),
	config = require('../../config/config'),
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

	updateSteamInfo: (usr, avatar, personaname) => {
		if ((usr.permission & module.exports.Permission.BANNED_AVATAR) === 0)
			usr.avatar_url = avatar;

		if ((usr.permission & module.exports.Permission.BANNED_ALIAS) === 0)
			usr.alias = personaname;

		return usr.save();
	},

	getSteamInfo: (usr, resolve, reject) => {
		axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
			params: {
				key: config.steam.webAPIKey,
				steamids: usr.id
			}
		}).then(resp => {
			var respData = resp.data.response.players[0];
			if (respData) {
				module.exports.updateSteamInfo(usr, respData.avatarfull, respData.personaname).then(() => {
					resolve(usr);
				}).catch(reject);
			}
			else {
				reject(usr);
			}
		});
	},

	findOrCreate: (userID, userObj) => {
		return new Promise((resolve, reject) => {
			// should use db module to create user if doesn't exist
			// then return the info for the user
			User.findOrCreate({ where: {id: userObj ? userObj.id : userID}}).spread((usr, created) => {
				console.log(created);
				if (created) {
					// Update the user object with latest steam alias and profile URL
					if (userObj)
					{
						module.exports.updateSteamInfo(usr, userObj.photos[2].value, userObj.displayName).then(() => {
							resolve(usr);
						}).catch(reject);
					}
					else
						module.exports.getSteamInfo(usr, resolve, reject);
				}
				else {
					resolve(usr);
				}
			}).catch(reject);
		});
	},

	find: (steamID) => {
		return User.findOne({ where: {id: steamID}});
	},

	// find: (context) => {
	// 	return new Promise((resolve, reject) => {
	// 		// fetch user from db using context given
	// 		resolve([{
	// 			id: 42,
	// 			name: "Gabe Newell",
	// 			alias: "Gaben",
	// 			permissions: 0
	// 		}]);
	// 	});
	// },

	update: (userID, userInfo) => {
		return new Promise((resolve, reject) => {
			// update user in db
			resolve();
		});
	},

	addPermission: (userID, permission) => {
		return new Promise((resolve, reject) => {
			// update permission in db to
			// current permission | permission
			resolve();
		});
	},

	removePermission: (userID, permission) => {
		return new Promise((resolve, reject) => {
			// update permission in db to
			// current permission & ~permission
			resolve();
		});
	}

};

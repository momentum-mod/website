'use strict';
const { User } = require('../../config/sqlize');

module.exports = {

	Permission: Object.freeze({
		BANNED: 1 << 0,
		ADMIN: 1 << 1,
		MAPPER: 1 << 2
	}),

	findOrCreate: (openID) => {
		return new Promise((resolve, reject) => {
			// should use db module to create user if doesn't exist
			// then return the info for the user
			User.findOrCreate({ where: {id: openID}}).spread((usr, created) => {
				console.log(created);
				resolve(usr);
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

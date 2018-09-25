'use strict';
const { User } = require('../../config/sqlize');

module.exports = {

	find: (steamID) => {
		return User.findOne({ where: {id: steamID}});
	},

	findOrCreate: (openID) => {
		return new Promise((resolve, reject) => {
			// should use db module to create user if doesn't exist
			// then return the info for the user
			User.findOrCreate({ where: {id: openID}}).spread((usr, created) => {
				console.log(created);
				resolve(usr);
			}).catch(reject);
		});
	}

};

'use strict';
const config = require('../../config/config');

module.exports = {

	findOrCreate: (openID, profile) => {
		return new Promise((resolve, reject) => {
			// should use db module to create user if doesn't exist
			// then return the info for the user
			const userInfo = {
				id: 1337,
				alias: '',
				permissions: 0
			}
			resolve(userInfo);
		});
	}

}

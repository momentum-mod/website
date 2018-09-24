'use strict';
const config = require('../../config/config'),
	User = require('../../config/sqlize');

module.exports = {

	findOrCreate: (openID, profile) => {
		return new Promise((resolve, reject) => {
			// should use db module to create user if doesn't exist
			// then return the info for the user
			User.findOne({ where: {id: openID}}).then((usr) => {
				resolve(usr);
			}).catch((err) => {
				reject(err);
			});
		});
	}

}

'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('discordAuth', {
		discordID: type.STRING,
		displayName: type.STRING,
		accessToken: type.STRING,
		refreshToken: type.STRING,
	});
};
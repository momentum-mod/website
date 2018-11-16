'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('discordAuth', {
		discordID: type.INTEGER,
		token: type.STRING,
	});
};
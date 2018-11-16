'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('twitchAuth', {
		twitchID: type.INTEGER,
		displayName: type.STRING,
		token: type.STRING,
	});
};
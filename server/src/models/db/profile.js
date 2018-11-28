'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('profile', {
		alias: type.STRING,
		avatarURL: type.STRING,
		bio: type.STRING(1000),
	})
};

'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('profile', {
		alias: type.STRING(32),
		avatarURL: type.STRING,
		bio: type.STRING(1000),
	})
};

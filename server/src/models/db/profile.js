'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('profile', {
		bio: type.STRING(1000),
	})
};

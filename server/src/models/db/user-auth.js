'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('userAuth', {
		refreshToken: type.STRING,
	})
};

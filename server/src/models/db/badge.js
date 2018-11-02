'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('badge', {
		name: type.STRING,
		description: type.STRING,
		image: type.STRING,
	})
};

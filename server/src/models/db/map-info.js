'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapInfo', {
		avatarURL: type.STRING,
		description: type.STRING(1000),
		numBonuses: type.INTEGER,
		numZones: type.INTEGER.UNSIGNED,
		difficulty: type.INTEGER
	})
};

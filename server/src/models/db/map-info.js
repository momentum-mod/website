'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapInfo', {
		description: type.STRING(1000),
		numBonuses: type.TINYINT.UNSIGNED,
		numZones: type.TINYINT.UNSIGNED,
		isLinear: type.BOOLEAN,
		difficulty: type.INTEGER,
		creationDate: type.DATE,
	})
};

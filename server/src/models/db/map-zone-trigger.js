'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneTrigger', {
		type: type.TINYINT.UNSIGNED,
		pointsHeight: type.FLOAT,
		pointsZPos: type.FLOAT,
		points: type.JSON,
	})
};

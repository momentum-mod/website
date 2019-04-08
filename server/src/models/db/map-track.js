'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapTrack', {
		trackNum: type.TINYINT.UNSIGNED,
		numZones: type.TINYINT.UNSIGNED,
		isLinear: type.BOOLEAN,
		difficulty: type.TINYINT.UNSIGNED,
	})
};

'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneStats', {
		zoneNum: {
			type: type.TINYINT.UNSIGNED,
			defaultValue: 0,
		},
	})
};

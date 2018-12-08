'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('runZoneStats', {
		zoneNum: {
			type: type.TINYINT.UNSIGNED,
			defaultValue: 0,
		},
	})
};

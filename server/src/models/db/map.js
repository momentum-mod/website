'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('map', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		name: type.STRING,
		statusFlag: {
			type: type.TINYINT,
			defaultValue: 1
		},
		leaderboardID: type.BIGINT,
		download: type.STRING
	})
};

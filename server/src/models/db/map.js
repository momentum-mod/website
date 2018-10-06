'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('map', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		name: {
			type: type.STRING,
			unique: true
		},
		leaderboardID: type.BIGINT,
		info: type.STRING,
		download: type.STRING
	})
};

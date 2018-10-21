'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapInfo', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		totalDownloads: {
			type: type.BIGINT,
			defaultValue: 0
		},
		avatarURL: type.STRING,
		description: type.STRING,
		numBonuses: type.INTEGER,
		numCheckpoints: type.INTEGER,
		numStages: type.INTEGER,
		difficulty: type.INTEGER
	})
};

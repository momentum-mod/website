'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapInfo', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		avatarURL: type.STRING,
		description: type.STRING(1000),
		numBonuses: type.INTEGER,
		numCheckpoints: type.INTEGER,
		numStages: type.INTEGER,
		difficulty: type.INTEGER
	})
};

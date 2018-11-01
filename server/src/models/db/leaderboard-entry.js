'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('leaderboardEntry', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		tickrate: type.SMALLINT.UNSIGNED,
		dateAchieved: type.DATE,
		time: type.FLOAT.UNSIGNED,
		flags: type.INTEGER.UNSIGNED,
		file: type.STRING,
	})
};

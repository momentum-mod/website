'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('leaderboard', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		enabled: type.BOOLEAN,
	})
};

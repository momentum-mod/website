'use strict';

const { Map, User, Run } = require('../../../config/sqlize');

module.exports = (sequelize, type) => {
	return sequelize.define('mapRank', {
		mapID: {
			type: type.INTEGER.UNSIGNED,
			primaryKey: true,
			foreignKey: true,
			references: {
				model: Map,
				key: 'id',
			}
		},
		userID: {
			type: type.STRING,
			primaryKey: true,
			foreignKey: true,
			references: {
				model: User,
				key: 'id',
			}
		},
		runID: {
			type: type.BIGINT.UNSIGNED,
			foreignKey: true,
			references: {
				model: Run,
				key: 'id',
			}
		},
		rank: type.INTEGER.UNSIGNED,
		rankXP: type.INTEGER.UNSIGNED,
	});
};
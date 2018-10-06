'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('map_credit', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		type: type.INTEGER
	})
};

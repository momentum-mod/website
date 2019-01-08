'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapCredit', {
		id: {
			type: type.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		type: type.TINYINT
	})
};

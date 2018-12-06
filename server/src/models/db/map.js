'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('map', {
		id: {
			type: type.INTEGER.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		name: type.STRING(32),
		type: {
			type: type.SMALLINT.UNSIGNED,
			defaultValue: 0,
		},
		statusFlag: {
			type: type.TINYINT,
			defaultValue: 2
		},
		downloadURL: type.STRING,
		hash: type.CHAR(40),
	})
};

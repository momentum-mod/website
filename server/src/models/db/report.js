'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('report', {
		data: type.STRING, // TODO: everything's an int except for users...
		type: type.TINYINT.UNSIGNED,
		category: type.SMALLINT.UNSIGNED,
		message: type.STRING(1000),
		resolved: type.BOOLEAN,
	})
};

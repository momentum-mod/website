'use strict';

module.exports = (sequelize, type) => {
	// Followee follows the followed
	return sequelize.define('follow', {
		notifyOn: {
			type: type.TINYINT.UNSIGNED,
			defaultValue: 0,
		},
	});
};
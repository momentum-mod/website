'use strict';

module.exports = (sequelize, type) => {
	// Followee follows the followed
	return sequelize.define('follow', {
		followeeID: {
			type: type.STRING(20),
			primaryKey: true,
			references: {
				model: 'users',
				key: 'id',
			}
		},
		followedID: {
			type: type.STRING(20),
			primaryKey: true,
			references: {
				model: 'users',
				key: 'id',
			}
		},
		notifyOn: {
			type: type.TINYINT.UNSIGNED,
			defaultValue: 0,
		},
	});
};
'use strict';

module.exports = (sequelize, type) => {
	// Followee follows the followed
	return sequelize.define('follow', {
		followeeID: {
			type: type.STRING,
			primaryKey: true,
			references: {
				model: 'users',
				key: 'id',
			}
		},
		followedID: {
			type: type.STRING,
			primaryKey: true,
			references: {
				model: 'users',
				key: 'id',
			}
		},
		notify: type.BOOLEAN,
	});
};
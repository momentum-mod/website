'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('notification', {
		read: {
			type: type.BOOLEAN,
			defaultValue: false,
		},
	})
};

'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('notification', {
		read: type.BOOLEAN,
	})
};

'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('profile', {
		bio: {
			type: type.STRING(1000),
			defaultValue: '',
		},
	})
};

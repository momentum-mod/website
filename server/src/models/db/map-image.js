'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapImage', {
		small: type.STRING,
		medium: type.STRING,
		large: type.STRING,
	})
};

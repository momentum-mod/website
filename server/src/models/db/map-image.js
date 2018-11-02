'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapImage', {
		URL: type.STRING,
	})
};

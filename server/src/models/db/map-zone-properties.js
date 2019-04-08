'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneProps', {
		properties: type.JSON,
	})
};
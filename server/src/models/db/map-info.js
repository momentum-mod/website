'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapInfo', {
		description: type.STRING(1000),
		numTracks: type.TINYINT.UNSIGNED,
		creationDate: type.DATE,
	})
};

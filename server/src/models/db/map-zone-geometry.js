'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapZoneGeometry', {
		pointsHeight: type.FLOAT,
		pointsZPos: type.FLOAT,
		points: type.GEOMETRY('POLYGON'),
	})
};
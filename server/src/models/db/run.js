'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('run', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		isPersonalBest: type.BOOLEAN,
		tickRate: type.FLOAT,
		dateAchieved: type.DATE,
		time: type.DOUBLE.UNSIGNED,
		flags: type.INTEGER.UNSIGNED,
		file: type.STRING,
	}, {
		indexes: [
			{
				fields: ['flags'],
			}
		]
	});
};

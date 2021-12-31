'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('run', {
		id: {
			type: type.BIGINT.UNSIGNED,
			primaryKey: true,
			autoIncrement: true
		},
		trackNum: type.TINYINT.UNSIGNED,
		zoneNum: type.TINYINT.UNSIGNED,
		ticks: type.INTEGER.UNSIGNED,
		tickRate: type.DECIMAL(5, 5),
		time: {
			type: type.VIRTUAL,
			get() {
				return this.getDataValue('ticks') * this.getDataValue('tickRate');
			}
		},
		flags: type.INTEGER.UNSIGNED,
		file: type.STRING,
		hash: type.STRING(40),
	}, {
		indexes: [
			{
				fields: ['flags'],
			}
		]
	});
};

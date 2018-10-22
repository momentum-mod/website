'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('activity', {
		id: {
			type: type.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		/*
		SEE THE "activity.ts" FILE FOR DEFINITION OF TYPE
		export enum Activity_Type {
		  ALL = 0,
		  TIME_SUBMITTED = 1,
		  MAP_UPLOADED = 2,
		}
		 */
		type: type.TINYINT,
		data: type.BIGINT,
	});
};

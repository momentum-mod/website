'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('mapReview', {
		text: type.STRING(1000)
	})
};

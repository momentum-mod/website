'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('twitterAuth', {
		twitterID: type.STRING,
		displayName: type.STRING,
		oauthKey: type.STRING,
		oauthSecret: type.STRING,
	});
};
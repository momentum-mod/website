'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('profile', {
		alias: type.STRING,
		avatarURL: type.STRING,
		bio: type.STRING,
		twitterName: type.STRING,
		discordName: type.STRING,
		youtubeName: type.STRING,
		twitchName: type.STRING,
	})
};

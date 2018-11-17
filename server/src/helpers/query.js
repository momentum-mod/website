'use strict';
const { MapInfo, MapCredit, MapStats, User, Profile, MapImage, DiscordAuth, TwitterAuth, TwitchAuth } = require('../../config/sqlize');

const expansionMap = {
	info: {
		model: MapInfo,
		as: 'info'
	},
	submitter: {
		model: User,
		as: 'submitter',
		include: [Profile]
	},
	credits: {
		model: MapCredit,
		as: 'credits',
		include: {
			model: User,
			include: [Profile]
		}
	},
	images: {
		model: MapImage,
		as: 'images'
	},
	mapStats: {
		model: MapStats,
		as: 'stats'
	},
	user: {
		model: User,
		include: [Profile]
	},
	profile: {
		model: Profile,
		include: [
			{
				model: DiscordAuth,
				attributes: {
					exclude: ['accessToken', 'refreshToken'],
				}
			},
			{
				model: TwitterAuth,
				attributes: {
					exclude: ['oauthKey', 'oauthSecret'], // Sorry, thieves
				},
			},
			{
				model: TwitchAuth,
				attributes: {
					exclude: ['token'],
				}
			}
		]
	},
};

module.exports = {

	addExpansions: (queryContext, expandString, allowedExpansions) => {
		if (!expandString) return;
		if (!queryContext.include) queryContext.include = [];
		const expansionNames = expandString.split(',');
		const addedExpansions = [];
		for (let i = 0; i < expansionNames.length; i++) {
			if (allowedExpansions && !allowedExpansions.includes(expansionNames[i])) {
				continue;
			}
			if (expansionNames[i] in expansionMap && !addedExpansions.includes(expansionNames[i])) {
				addedExpansions.push(expansionNames[i]);
				queryContext.include.push(expansionMap[expansionNames[i]]);
			}
		}
	}

};

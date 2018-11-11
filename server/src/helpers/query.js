'use strict';
const { MapInfo, MapCredit, User, Profile } = require('../../config/sqlize');

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
	user: {
		model: User,
		include: [Profile]
	},
	profile: {
		model: Profile
	},
};

module.exports = {

	addExpansions: (queryContext, expandString, allowedExpansions) => {
		if (!expandString) return;
		if (!queryContext.include) queryContext.include = [];
		const expansionNames = expandString.split(',');
		for (let i = 0; i < expansionNames.length; i++) {
			if (allowedExpansions && !allowedExpansions.includes(expansionNames[i])) {
				continue;
			}
			if (expansionNames[i] in expansionMap) {
				queryContext.include.push(expansionMap[expansionNames[i]]);
			}
		}
	}

};

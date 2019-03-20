'use strict';
const { UserStats } = require('../../config/sqlize');

module.exports = {

	updateAll: (userStats) => {
        return UserStats.update(userStats, { where: {} });
    },
    
};

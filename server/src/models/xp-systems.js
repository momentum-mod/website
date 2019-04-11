'use strict';
const { XPSystems } = require('../../config/sqlize');

module.exports = {

	getXPSystems: () => {
		return XPSystems.findOne({where: {id: 1}});
	},

	updateXPSystems: (systemsObj) => {
		return XPSystems.update(systemsObj, {where: {id: 1}});
	},

};

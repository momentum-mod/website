'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	UserModel = require('../src/models/db/user'),
	ProfileModel = require('../src/models/db/profile'),
	MapModel = require('../src/models/db/map'),
	MapInfoModel = require('../src/models/db/map-info'),
	MapCreditModel = require('../src/models/db/map-credit'),
	ActivityModel = require('../src/models/db/activity');

const sequelize = new Sequelize({
	database: config.db.name,
	username: config.db.userName,
	password: config.db.password,
	host: config.db.host,
	dialect: 'mysql',
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000
	}
});

const User = UserModel(sequelize, Sequelize);
const Profile = ProfileModel(sequelize, Sequelize);
const Map = MapModel(sequelize, Sequelize);
const MapInfo = MapInfoModel(sequelize, Sequelize);
const MapCredit = MapCreditModel(sequelize, Sequelize);
const Activity = ActivityModel(sequelize, Sequelize);

User.hasOne(Profile, { as: 'profile', foreignKey: 'userID' });
User.hasMany(Activity, {foreignKey: 'userID'});
Activity.belongsTo(User, {foreignKey: 'userID'});
Map.hasMany(MapCredit, { as: 'Credits', foreignKey: 'mapID' });
MapInfo.belongsTo(Map, {as: 'Map', foreignKey: 'mapID'});
Map.belongsTo(User, { as: 'Submitter', foreignKey: 'submitterID' });
MapCredit.belongsTo(User, { foreignKey: 'userID' });

sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true }) // temporary
.then(() => {
	sequelize.sync({force: true})
		.then(() => {
			console.log(`Database & tables created!`)
		}).catch((err) => {
		console.warn(err);
	});
});

module.exports = {
	Op: Sequelize.Op,
	sequelize,
	User,
	Profile,
	Map,
	MapInfo,
	MapCredit,
	Activity
};

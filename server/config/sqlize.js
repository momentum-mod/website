'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	UserModel = require('../src/models/db/user'),
	ProfileModel = require('../src/models/db/profile'),
	MapModel = require('../src/models/db/map'),
	MapInfoModel = require('../src/models/db/map-info'),
	MapCreditModel = require('../src/models/db/map-credit'),
	ActivityModel = require('../src/models/db/activity'),
	env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize({
	database: config.db.name,
	username: config.db.userName,
	password: config.db.password,
	host: config.db.host,
	logging: config.db.logging,
	operatorsAliases: false,
	dialect: 'mysql',
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000
	}
});

const forceSyncDB = () => {
	return sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true })
	.then(() => {
		return sequelize.sync({force: true});
	}).then(() => {
		return sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
	});
}

const User = UserModel(sequelize, Sequelize);
const Profile = ProfileModel(sequelize, Sequelize);
const Map = MapModel(sequelize, Sequelize);
const MapInfo = MapInfoModel(sequelize, Sequelize);
const MapCredit = MapCreditModel(sequelize, Sequelize);
const Activity = ActivityModel(sequelize, Sequelize);

User.hasOne(Profile, { foreignKey: 'userID' });
User.hasMany(Activity, { foreignKey: 'userID' });
Activity.belongsTo(User, { foreignKey: 'userID' });
Map.hasMany(MapCredit, { as: 'credits', foreignKey: 'mapID' });
Map.hasOne(MapInfo, { as: 'info', foreignKey: 'mapID' });
Map.belongsTo(User, { foreignKey: 'submitterID' });
MapCredit.belongsTo(User, { foreignKey: 'userID' });

if (env === 'development') {
	forceSyncDB()
	.then(() => {
		console.log(`Database & tables created!`)
	}).catch(err => {
		console.error(err);
	});
}

module.exports = {
	Op: Sequelize.Op,
	sequelize,
	forceSyncDB,
	User,
	Profile,
	Map,
	MapInfo,
	MapCredit,
	Activity
};

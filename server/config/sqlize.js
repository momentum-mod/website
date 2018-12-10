'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	UserModel = require('../src/models/db/user'),
	UserAuthModel = require('../src/models/db/user-auth'),
	UserStatsModel = require('../src/models/db/user-stats'),
	ProfileModel = require('../src/models/db/profile'),
	MapModel = require('../src/models/db/map'),
	MapInfoModel = require('../src/models/db/map-info'),
	MapCreditModel = require('../src/models/db/map-credit'),
	ActivityModel = require('../src/models/db/activity'),
	MapLibraryEntryModel = require('../src/models/db/map-library'),
	MapFavoriteModel = require('../src/models/db/map-favorite'),
	UserFollowsModel = require('../src/models/db/user-follow'),
	NotificationModel = require('../src/models/db/notification'),
	BadgeModel = require('../src/models/db/badge'),
	UserBadgeModel = require('../src/models/db/user-badge'),
	ReportModel = require('../src/models/db/report'),
	MapStatsModel = require('../src/models/db/map-stats'),
	MapZoneStatsModel = require('../src/models/db/map-zone-stats'),
	MapReviewModel = require('../src/models/db/map-review'),
	MapImageModel = require('../src/models/db/map-image'),
	RunModel = require('../src/models/db/run'),
	RunStatsModel = require('../src/models/db/run-stats'),
	RunZoneStatsModel = require('../src/models/db/run-zone-stats'),
	TwitterAuthModel = require('../src/models/db/auth-twitter'),
	TwitchAuthModel = require('../src/models/db/auth-twitch'),
	DiscordAuthModel = require('../src/models/db/auth-discord'),
	BaseStatsModel = require('../src/models/db/base-stats'),
	env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize({
	database: config.db.name,
	username: config.db.userName,
	password: config.db.password,
	host: config.db.host,
	logging: config.db.logging,
	operatorsAliases: false,
	dialect: 'mysql',
	define: { // TODO: consider definition to be at column/table level?
		charset: 'utf8',
		collate: 'utf8_unicode_ci'
	},
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
};

const User = UserModel(sequelize, Sequelize);
const UserAuth = UserAuthModel(sequelize, Sequelize);
const UserStats = UserStatsModel(sequelize, Sequelize);
const TwitterAuth = TwitterAuthModel(sequelize, Sequelize);
const TwitchAuth = TwitchAuthModel(sequelize, Sequelize);
const DiscordAuth = DiscordAuthModel(sequelize, Sequelize);
const Profile = ProfileModel(sequelize, Sequelize);
const Map = MapModel(sequelize, Sequelize);
const MapInfo = MapInfoModel(sequelize, Sequelize);
const MapCredit = MapCreditModel(sequelize, Sequelize);
const Activity = ActivityModel(sequelize, Sequelize);
const MapLibraryEntry = MapLibraryEntryModel(sequelize, Sequelize);
const MapFavorite = MapFavoriteModel(sequelize, Sequelize);
const UserFollows = UserFollowsModel(sequelize, Sequelize);
const Notification = NotificationModel(sequelize, Sequelize);
const Badge = BadgeModel(sequelize, Sequelize);
const UserBadge = UserBadgeModel(sequelize, Sequelize);
const Report = ReportModel(sequelize, Sequelize);
const MapStats = MapStatsModel(sequelize, Sequelize);
const MapZoneStats = MapZoneStatsModel(sequelize, Sequelize);
const MapReview = MapReviewModel(sequelize, Sequelize);
const MapImage = MapImageModel(sequelize, Sequelize);
const Run = RunModel(sequelize, Sequelize);
const RunStats = RunStatsModel(sequelize, Sequelize);
const RunZoneStats = RunZoneStatsModel(sequelize, Sequelize);
const BaseStats = BaseStatsModel(sequelize, Sequelize);

User.hasOne(Profile, { foreignKey: 'userID' });
User.hasMany(Activity, { foreignKey: 'userID' });
User.hasOne(UserAuth, { as: 'auth', foreignKey: 'userID' });
User.hasOne(UserStats, { as: 'stats', foreignKey: 'userID' });
Profile.hasOne(DiscordAuth, {foreignKey: 'profileID'});
Profile.hasOne(TwitchAuth, {foreignKey: 'profileID'});
Profile.hasOne(TwitterAuth, {foreignKey: 'profileID'});
Activity.belongsTo(User, { foreignKey: 'userID' });
Map.hasMany(MapCredit, { as: 'credits', foreignKey: 'mapID' });
Map.hasOne(MapInfo, { as: 'info', foreignKey: 'mapID' });
Map.belongsTo(User, { as: 'submitter', foreignKey: 'submitterID' });
MapCredit.belongsTo(User, { foreignKey: 'userID' });
MapLibraryEntry.belongsTo(User, { foreignKey: 'userID' });
MapLibraryEntry.belongsTo(Map, { as: 'map', foreignKey: 'mapID' });
MapFavorite.belongsTo(User, { foreignKey: 'userID' });
Map.hasMany(MapLibraryEntry, { as: 'libraryEntries', foreignKey: 'mapID' });
Map.hasMany(MapFavorite, { as: 'favorites', foreignKey: 'mapID' });
MapFavorite.belongsTo(Map, { as: 'map', foreignKey: 'mapID' });
MapCredit.belongsTo(Map, { as: 'map', foreignKey: 'mapID'});
UserFollows.belongsTo(User, { as: 'followee', foreignKey: 'followeeID' });
UserFollows.belongsTo(User, { as: 'followed', foreignKey: 'followedID' });
Notification.belongsTo(User, { as: 'forUser', foreignKey: 'forUserID' });
User.hasMany(UserFollows, { foreignKey: 'followedID' });
Activity.hasMany(Notification, { as: 'notifications', foreignKey: 'activityID'});
Notification.belongsTo(Activity, { as: 'activity', foreignKey: 'activityID'});
UserBadge.belongsTo(Badge, { as: 'badge', foreignKey: 'badgeID'});
UserBadge.belongsTo(User, { as: 'user', foreignKey: 'userID'});
UserBadge.hasOne(Profile, {as: 'featuredBadge', foreignKey: 'featuredBadgeID'});
Report.belongsTo(User, {as: 'submitter', foreignKey: 'submitterID'});
Report.belongsTo(User, {as: 'resolver', foreignKey: 'resolverID'});
Map.hasOne(MapStats, {as: 'stats', foreignKey: 'mapID'});
MapStats.hasMany(MapZoneStats, {as: 'zoneStats', foreignKey: 'mapStatsID'});
MapZoneStats.belongsTo(BaseStats, {as: 'baseStats', foreignKey: 'baseStatsID'});
MapReview.belongsTo(User, {as: 'reviewer', foreignKey: 'reviewerID'});
MapReview.belongsTo(Map, {as: 'map', foreignKey: 'mapID'});
Map.hasMany(MapImage, {as: 'images', foreignKey: 'mapID'});
MapImage.hasOne(MapInfo, {as: 'thumbnail', foreignKey: 'thumbnailID'});
Map.hasMany(Run, {as: 'runs', foreignKey: 'mapID'});
Run.belongsTo(Map, {as: 'map', foreignKey: 'mapID'});
Run.belongsTo(User, { foreignKey: 'playerID' });
Run.hasOne(RunStats, { as: 'stats', foreignKey: 'runID' });
RunStats.hasMany(RunZoneStats, { as: 'zoneStats', foreignKey: 'runStatsID' });
RunZoneStats.belongsTo(BaseStats, { as: 'baseStats', foreignKey: 'baseStatsID'});

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
	UserAuth,
	UserStats,
	DiscordAuth,
	TwitterAuth,
	TwitchAuth,
	Profile,
	Map,
	MapInfo,
	MapCredit,
	Activity,
	MapLibraryEntry,
	MapFavorite,
	UserFollows,
	Notification,
	Badge,
	UserBadge,
	Report,
	MapStats,
	MapZoneStats,
	MapReview,
	MapImage,
	Run,
	RunStats,
	RunZoneStats,
	BaseStats,
};

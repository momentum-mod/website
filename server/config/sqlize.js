'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	xpSystems = require('../src/models/xp-systems'),
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
	RunZoneStatsModel = require('../src/models/db/run-zone-stats'),
	TwitterAuthModel = require('../src/models/db/auth-twitter'),
	TwitchAuthModel = require('../src/models/db/auth-twitch'),
	DiscordAuthModel = require('../src/models/db/auth-discord'),
	BaseStatsModel = require('../src/models/db/base-stats'),
	MapRankModel = require('../src/models/db/map-rank'),
	MapTrackModel = require('../src/models/db/map-track'),
	MapTrackStatsModel = require('../src/models/db/map-track-stats'),
	MapZoneModel = require('../src/models/db/map-zone'),
	MapZoneTriggerModel = require('../src/models/db/map-zone-trigger'),
	MapZonePropsModel = require('../src/models/db/map-zone-properties'),
	XPSystemsModel = require('../src/models/db/xp-systems'),
	RunSessionModel = require('../src/models/db/run-session'),
	RunSessionTSModel = require('../src/models/db/run-session-timestamp'),
	env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize({
	database: config.db.name,
	username: config.db.userName,
	password: config.db.password,
	host: config.db.host,
	logging: config.db.logging,
	dialect: 'mysql',
	define: { // TODO: consider definition to be at column/table level?
		charset: 'utf8mb4',
		collate: 'utf8mb4_unicode_ci'
	},
	pool: config.db.pool,
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
const MapTrack = MapTrackModel(sequelize, Sequelize);
const MapZone = MapZoneModel(sequelize, Sequelize);
const MapZoneTrigger = MapZoneTriggerModel(sequelize, Sequelize);
const MapZoneProperties = MapZonePropsModel(sequelize, Sequelize);
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
const MapTrackStats = MapTrackStatsModel(sequelize, Sequelize);
const MapZoneStats = MapZoneStatsModel(sequelize, Sequelize);
const MapReview = MapReviewModel(sequelize, Sequelize);
const MapImage = MapImageModel(sequelize, Sequelize);
const Run = RunModel(sequelize, Sequelize);
const RunZoneStats = RunZoneStatsModel(sequelize, Sequelize);
const BaseStats = BaseStatsModel(sequelize, Sequelize);
const UserMapRank = MapRankModel(sequelize, Sequelize);
const XPSystems = XPSystemsModel(sequelize, Sequelize);
const RunSession = RunSessionModel(sequelize, Sequelize);
const RunSessionTS = RunSessionTSModel(sequelize, Sequelize);

User.hasOne(Profile, { foreignKey: 'userID', onDelete: 'CASCADE' });
User.hasMany(Activity, { foreignKey: 'userID', onDelete: 'CASCADE' });
User.hasOne(UserAuth, { as: 'auth', foreignKey: 'userID', onDelete: 'CASCADE' });
User.hasOne(UserStats, { as: 'stats', foreignKey: 'userID', onDelete: 'CASCADE' });
User.hasMany(UserMapRank, { foreignKey: 'userID', onDelete: 'CASCADE'});
User.hasOne(UserMapRank, { as: 'mapRank', foreignKey: 'userID', constraints: false});
User.hasOne(RunSession, { foreignKey: 'userID', onDelete: 'CASCADE' });
RunSession.hasMany(RunSessionTS, { as: 'timestamps', foreignKey: 'sessionID', onDelete: 'CASCADE' });
RunSessionTS.belongsTo(RunSession, { as: 'session', foreignKey: 'sessionID'});
Profile.hasOne(DiscordAuth, {foreignKey: 'profileID', onDelete: 'CASCADE'});
Profile.hasOne(TwitchAuth, {foreignKey: 'profileID', onDelete: 'CASCADE'});
Profile.hasOne(TwitterAuth, {foreignKey: 'profileID', onDelete: 'CASCADE'});
Activity.belongsTo(User, { foreignKey: 'userID' });
Map.hasMany(MapCredit, { as: 'credits', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.hasOne(MapInfo, { as: 'info', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.belongsTo(User, { as: 'submitter', foreignKey: 'submitterID' });
Map.hasMany(MapTrack, { as: 'tracks', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.hasOne(MapTrack, { as: 'mainTrack', foreignKey: 'mapID', constraints: false });
MapTrack.belongsTo(Map, { foreignKey: 'mapID' });
MapTrack.hasOne(MapTrackStats, { as: 'stats', foreignKey: 'mapTrackID', onDelete: 'CASCADE' });
MapTrack.hasMany(MapZone, { as: 'zones', foreignKey: 'mapTrackID', onDelete: 'CASCADE' });
RunSession.belongsTo(MapTrack, { as: 'track', foreignKey: 'mapTrackID'});
MapZone.hasMany(MapZoneTrigger, { as: 'triggers', foreignKey: 'mapZoneID', onDelete: 'CASCADE' });
MapZoneTrigger.hasOne(MapZoneProperties, { as: 'zoneProps', foreignKey: 'triggerID', onDelete: 'CASCADE'});
MapZone.hasOne(MapZoneStats, { as: 'stats', foreignKey: 'mapZoneID', onDelete: 'CASCADE' });
MapCredit.belongsTo(User, { foreignKey: 'userID' });
MapLibraryEntry.belongsTo(User, { foreignKey: 'userID' });
MapLibraryEntry.belongsTo(Map, { as: 'map', foreignKey: 'mapID' });
MapFavorite.belongsTo(User, { foreignKey: 'userID' });
Map.hasMany(MapLibraryEntry, { as: 'libraryEntries', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.hasMany(MapFavorite, { as: 'favorites', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.hasMany(UserMapRank, { foreignKey: 'mapID', onDelete: 'CASCADE'});
Map.hasOne(UserMapRank, { as: 'personalBest', foreignKey: 'mapID', constraints: false});
Map.hasOne(UserMapRank, { as: 'worldRecord', foreignKey: 'mapID', constraints: false});
MapFavorite.belongsTo(Map, { as: 'map', foreignKey: 'mapID' });
MapCredit.belongsTo(Map, { as: 'map', foreignKey: 'mapID'});
UserFollows.belongsTo(User, { as: 'followee', foreignKey: 'followeeID', onDelete: 'CASCADE' });
UserFollows.belongsTo(User, { as: 'followed', foreignKey: 'followedID', onDelete: 'CASCADE' });
Notification.belongsTo(User, { as: 'forUser', foreignKey: 'forUserID' });
User.belongsToMany(User, { as: 'followers', foreignKey: 'followedID', otherKey: 'followeeID', through: UserFollows, onDelete: 'CASCADE' });
User.belongsToMany(User, { as: 'following', foreignKey: 'followeeID', otherKey: 'followedID', through: UserFollows, onDelete: 'CASCADE' });
Activity.hasMany(Notification, { as: 'notifications', foreignKey: 'activityID', onDelete: 'CASCADE'});
Notification.belongsTo(Activity, { as: 'activity', foreignKey: 'activityID'});
UserBadge.belongsTo(Badge, { as: 'badge', foreignKey: 'badgeID'});
UserBadge.belongsTo(User, { as: 'user', foreignKey: 'userID'});
UserBadge.hasOne(Profile, {as: 'featuredBadge', foreignKey: 'featuredBadgeID'});
Report.belongsTo(User, {as: 'submitter', foreignKey: 'submitterID'});
Report.belongsTo(User, {as: 'resolver', foreignKey: 'resolverID'});
Map.hasOne(MapStats, {as: 'stats', foreignKey: 'mapID', onDelete: 'CASCADE'});
MapStats.belongsTo(BaseStats, {as: 'baseStats', foreignKey: 'baseStatsID', onDelete: 'CASCADE'});
MapTrackStats.belongsTo(BaseStats, {as: 'baseStats', foreignKey: 'baseStatsID', onDelete: 'CASCADE'});
MapZoneStats.belongsTo(BaseStats, {as: 'baseStats', foreignKey: 'baseStatsID', onDelete: 'CASCADE'});
MapReview.belongsTo(User, {as: 'reviewer', foreignKey: 'reviewerID'});
MapReview.belongsTo(Map, {as: 'map', foreignKey: 'mapID'});
Map.hasMany(MapImage, { as: 'images', foreignKey: 'mapID', onDelete: 'CASCADE' });
Map.belongsTo(MapImage, { as: 'thumbnail', foreignKey: 'thumbnailID', constraints: false });
Map.hasMany(Run, {as: 'runs', foreignKey: 'mapID', onDelete: 'CASCADE'});
Run.belongsTo(Map, {as: 'map', foreignKey: 'mapID'});
Run.belongsTo(User, { foreignKey: 'playerID' });
Run.belongsTo(BaseStats, { as: 'overallStats', foreignKey: 'baseStatsID', onDelete: 'CASCADE' });
Run.hasOne(UserMapRank, { as: 'rank', foreignKey: 'runID', onDelete: 'CASCADE'});
Run.hasMany(RunZoneStats, { as: 'zoneStats', foreignKey: 'runID', onDelete: 'CASCADE'});
RunZoneStats.belongsTo(Run, {foreignKey: 'runID'});
RunZoneStats.belongsTo(BaseStats, { as: 'baseStats', foreignKey: 'baseStatsID', onDelete: 'CASCADE'});
UserMapRank.belongsTo(Run, { foreignKey: 'runID'});
UserMapRank.belongsTo(User, { foreignKey: 'userID'});
UserMapRank.belongsTo(Map, { foreignKey: 'mapID'});

if (env !== 'test') {
	forceSyncDB().then(() => {
		// Create our default XP systems table if we don't already have it
		return xpSystems.initXPSystems(XPSystems);
	}).then(() => {
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
	RunZoneStats,
	BaseStats,
	UserMapRank,
	MapTrack,
	MapTrackStats,
	MapZone,
	MapZoneTrigger,
	MapZoneProperties,
	XPSystems,
	RunSession,
	RunSessionTS,
};

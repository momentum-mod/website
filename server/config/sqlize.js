'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	UserModel = require('../src/models/db/user'),
	ProfileModel = require('../src/models/db/profile'),
	MapModel = require('../src/models/db/map'),
	MapInfoModel = require('../src/models/db/map-info'),
	MapCreditModel = require('../src/models/db/map-credit');

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
/*// BlogTag will be our way of tracking relationship between Blog and Tag models
// each Blog can have multiple tags and each Tag can have multiple blogs
const BlogTag = sequelize.define('blog_tag', {})
const Blog = BlogModel(sequelize, Sequelize)
const Tag = TagModel(sequelize, Sequelize)

Blog.belongsToMany(Tag, { through: BlogTag, unique: false })
Tag.belongsToMany(Blog, { through: BlogTag, unique: false })
Blog.belongsTo(User);*/

User.hasOne(Profile, { foreignKey: 'userID' });
Map.hasMany(MapCredit, { foreignKey: 'mapID' });
Map.hasOne(MapInfo, { foreignKey: 'mapID' });
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
	MapCredit/*,
	Blog,
	Tag*/
};

'use strict';
const Sequelize = require('sequelize'),
	config = require('./config'),
	UserModel = require('../src/models/db/user');

const sequelize = new Sequelize({
	database: config.db.name,
	user: config.db.userName,
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
/*// BlogTag will be our way of tracking relationship between Blog and Tag models
// each Blog can have multiple tags and each Tag can have multiple blogs
const BlogTag = sequelize.define('blog_tag', {})
const Blog = BlogModel(sequelize, Sequelize)
const Tag = TagModel(sequelize, Sequelize)

Blog.belongsToMany(Tag, { through: BlogTag, unique: false })
Tag.belongsToMany(Blog, { through: BlogTag, unique: false })
Blog.belongsTo(User);*/

sequelize.sync({force: true})
	.then(() => {
		console.log(`Database & tables created!`)
	}).catch((err) => {

});

module.exports = {
	User/*,
	Blog,
	Tag*/
};
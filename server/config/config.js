const path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

const config = {
	test: {
		root: rootPath,
		port: 3002
	},
	development: {
		root: rootPath,
		port: 3002
	},
	production: {
		root: rootPath,
		port: 3002
	}
};

module.exports = config[env];

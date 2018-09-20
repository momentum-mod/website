const path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

const config = {
	test: {
		root: rootPath,
		baseUrl: 'http://localhost:3002',
		domain: 'localhost',
		port: 3002,
		accessToken: {
			secret: 'G-KaNdRgUkXp2s5v8y/B?E(H+MbQeShVmYq3t6w9z$C&F)J@NcRfUjWnZr4u7x!A',
			expTime: '8h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		}
	},
	development: {
		root: rootPath,
		baseUrl: 'http://localhost:3002',
		domain: 'localhost',
		port: 3002,
		accessToken: {
			secret: 'G-KaNdRgUkXp2s5v8y/B?E(H+MbQeShVmYq3t6w9z$C&F)J@NcRfUjWnZr4u7x!A',
			expTime: '8h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		}
	},
	production: {
		root: rootPath,
		baseUrl: 'https://momentum-mod.org',
		domain: 'momentum-mod.org',
		port: 3002,
		accessToken: {
			secret: process.env.JWT_SECRET,
			expTime: '8h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		}
	}
}

module.exports = config[env];

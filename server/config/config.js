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
			expTime: '8h',
			gameExpTime: '24h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		},
		db: {
			name: 'momentum_test',
			userName: 'mom_test',
			password: '',
			host: 'localhost',
			logging: false
		}
	},
	development: {
		root: rootPath,
		baseUrl: 'http://localhost:3002',
		domain: 'localhost',
		port: 3002,
		accessToken: {
			secret: 'G-KaNdRgUkXp2s5v8y/B?E(H+MbQeShVmYq3t6w9z$C&F)J@NcRfUjWnZr4u7x!A',
			expTime: '8h',
			gameExpTime: '24h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		},
		db: {
			name: 'momentum',
			userName: 'mom',
			password: '',
			host: 'localhost',
			logging: console.log
		}
	},
	production: {
		root: rootPath,
		baseUrl: process.env.BASE_URL,
		domain: 'momentum-mod.org',
		port: process.env.NODE_PORT,
		accessToken: {
			secret: process.env.JWT_SECRET,
			expTime: '8h',
			gameExpTime: '24h'
		},
		steam: {
			webAPIKey: process.env.STEAM_WEB_API_KEY
		},
		db: {
			name: 'momentum',
			userName: process.env.MOM_DATABASE_USER,
			password: process.env.MOM_DATABASE_PW,
			host: process.env.MOM_DATABASE_HOST,
			logging: false
		}
	}
};

module.exports = config[env];

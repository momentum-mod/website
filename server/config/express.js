const express = require('express'),
	path = require('path'),
	logger = require('morgan'),
	compress = require('compression'),
	methodOverride = require('method-override'),
	passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy,
	JwtStrategy = require('passport-jwt').Strategy,
	DiscordStrategy = require('passport-discord').Strategy,
	TwitchStrategy = require('passport-twitch-helix').Strategy,
	ExtractJwt = require('passport-jwt').ExtractJwt,
	fileUpload = require('express-fileupload'),
	swaggerUI = require('swagger-ui-express'),
	swaggerJSDoc = require('swagger-jsdoc'),
	swaggerDefinition = require('../docs/swagger/definition'),
	user = require('../src/models/user'),
	authMiddleware = require('../src/middlewares/auth'),
	bodyParser = require('body-parser');

const swaggerSpec = swaggerJSDoc({
	swaggerDefinition: swaggerDefinition,
	apis: ['./docs/**/*.yaml'],
});

module.exports = (app, config) => {

	if (app.get('env') === 'development') {
		app.use(logger('dev'));
	}

	app.use(express.json());
	app.use(bodyParser.raw({
		limit: '2kb'
	}));
	app.use(compress());
	app.use(express.static(config.root + '/public'));
	app.use(methodOverride());
	app.use(passport.initialize());
	app.use(fileUpload({
		limits: { fileSize: 200 * 1024 * 1024 },
		createParentPath: true,
		abortOnLimit: true,
	}));

	passport.use(new SteamStrategy({
		returnURL: config.baseUrl + '/auth/steam/return',
		realm: config.baseUrl,
		apiKey: config.steam.webAPIKey
	}, (openID, profile, done) => {
		user.findOrCreateFromWeb(profile)
		.then((userInfo) => {
			profile = Object.assign(userInfo, profile);
			done(null, profile);
		}).catch((err) => {
			done(err, false);
		});
	}));

	passport.use(new JwtStrategy({
		jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
		secretOrKey: config.accessToken.secret,
		issuer: config.domain,
		audience: ''
	}, (jwtPayload, done) => {
		done(null, jwtPayload);
	}));

	passport.use('jwt-authz', new JwtStrategy({
		jwtFromRequest: ExtractJwt.fromUrlQueryParameter('jwt'),
		secretOrKey: config.accessToken.secret,
		issuer: config.domain,
		audience: '',
	}, (jwtPayload, done) => {
		done(null, jwtPayload);
	}));

	passport.use(new DiscordStrategy({
		clientID: config.discord.clientID,
		clientSecret: config.discord.clientSecret,
		callbackURL: config.baseUrl + '/auth/discord/return',
		scope: ['identify'],
	}, (token, refresh, profile, cb) => {
		profile.token = token;
		profile.refresh = refresh;
		cb(null, profile);
	}));

	passport.use(new TwitchStrategy({
		clientID: config.twitch.clientID,
		clientSecret: config.twitch.clientSecret,
		callbackURL: config.baseUrl + '/auth/twitch/return',
		scope: 'user_read',
	}, (token, refresh, profile, cb) => {
		profile.token = token;
		profile.refresh = refresh;
		cb(null, profile);
	}));

	app.use(require('express-session')({ secret: config.session.secret, resave: true, saveUninitialized: true }));
	app.use('/api', [authMiddleware.requireLogin], require(config.root + '/src/routes/api'));
	app.use('/auth', require(config.root + '/src/routes/auth'));
	app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

	app.use('*', (req, res, next) => {
		try {
			res.sendFile(path.resolve(config.root + '/public/index.html'));
		} catch(err) {
			next(err);
		}
	});

	if (app.get('env') === 'development') {
		app.use((err, req, res, next) => {
			const status = err.status || 500;
			console.error(err);
			res.status(status).json({
				error: {
					code: status,
					message: err.message,
					error: err
				}
			});
		});
	}

	app.use((err, req, res, next) => {
		const status = err.status || 500;
		res.status(status).json({
			error: {
				code: status,
				message: err.status === 500 ?
					'Internal Server Error' : err.message
			}
		});
	});

};

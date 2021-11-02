const express = require('express'),
	path = require('path'),
	compress = require('compression'),
	methodOverride = require('method-override'),
	passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy,
	JwtStrategy = require('passport-jwt').Strategy,
	DiscordStrategy = require('passport-discord').Strategy,
	TwitchStrategy = require('@d-fischer/passport-twitch').Strategy,
	ExtractJwt = require('passport-jwt').ExtractJwt,
	fileUpload = require('express-fileupload'),
	swaggerUI = require('swagger-ui-express'),
	swaggerJSDoc = require('swagger-jsdoc'),
	swaggerDefinition = require('../docs/swagger/definition'),
	user = require('../src/models/user'),
	xml2js = require('xml2js').parseString,
	axios = require('axios'),
	authMiddleware = require('../src/middlewares/auth'),
	{ errors, isCelebrate } = require('celebrate'),
	bunyan = require('bunyan'),
	seq = require('bunyan-seq'),
	bunyanMiddleware = require('bunyan-middleware'),
	cors = require('cors');

const swaggerSpec = swaggerJSDoc({
	swaggerDefinition: swaggerDefinition,
	apis: ['./docs/**/*.yaml'],
});

function wrappedStdout() {
	return {
		write: (entry) => {
			// Format console output to be human readable
			const logObject = JSON.parse(entry);
			const severity = bunyan.nameFromLevel[logObject.level].toUpperCase();
			process.stdout.write(
				`[${logObject.time} ${severity}] ${logObject.msg}\n`
			);
			if (logObject.hasOwnProperty("err")) {
				process.stdout.write(`${JSON.stringify(logObject.err, null, 2)}\n`);
			}
		},
	};
}

module.exports = (app, config) => {
	// By default, always log to console
	loggerStreams = [
		{
			stream: wrappedStdout(),
			level: 'info',
		}
	];

	// In production, log to Seq as well
	if(app.get('env') === 'production')
	{
		loggerStreams.push(
			seq.createStream({
				serverUrl: process.env.SEQ_ADDRESS,
				apiKey: process.env.SEQ_TOKEN,
				level: 'info',
			})
		);
	}

	const logger = bunyan.createLogger({
		Application: 'Website',
		Environment: app.get('env'),
		name: 'Website',
		streams: loggerStreams
	});

	if (app.get('env') === 'development') {
		// In development, log all requests
		app.use(bunyanMiddleware({ logger: logger }));
	}

	app.use(cors({ origin: config.baseURL }));
	app.use(express.json());
	app.use(compress());
	app.use(express.static(config.root + '/public'));
	app.use(methodOverride());
	app.use(passport.initialize());
	app.use(fileUpload({
		limits: { fileSize: 300 * 1024 * 1024 },
		createParentPath: true,
		abortOnLimit: true,
	}));

	passport.use(new SteamStrategy({
		returnURL: config.baseURL_Auth + '/auth/steam/return',
		realm: config.baseURL_Auth,
		apiKey: config.steam.webAPIKey
	}, (openID, profile, done) => {
		const identifierRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
		const steamID = identifierRegex.exec(openID)[1];
		const URL = `https://steamcommunity.com/profiles/${steamID}?xml=1`;
		axios.get(URL).then(res => {
			xml2js(res.data, (err, result) => {
				if (err)
					return done(err);

				if (profile._json.profilestate !== 1)
					return done(null, false, {message: 'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'});

				if (config.steam.preventLimited && result.profile.isLimitedAccount[0] === '1')
					return done(null, false, {message: 'We do not authenticate limited Steam accounts. Buy something on Steam first!'});

				const profObj = {
					id: steamID,
					alias: result.profile.steamID[0],
					country: profile._json.loccountrycode, // Fetch from SteamStrategy json
					avatarURL: result.profile.avatarFull[0],
					_jsonXML: result,
					_json: profile._json,
				};
				user.findOrCreateFromWeb(profObj).then(userInfo => {
					return done(null, userInfo);
				}).catch(done);
			});
		}).catch(done);
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
		callbackURL: config.baseURL_Auth + '/auth/discord/return',
		scope: ['identify'],
	}, (token, refresh, profile, cb) => {
		profile.token = token;
		profile.refresh = refresh;
		cb(null, profile);
	}));

	passport.use(new TwitchStrategy({
		clientID: config.twitch.clientID,
		clientSecret: config.twitch.clientSecret,
		callbackURL: config.baseURL_Auth + '/auth/twitch/return',
		scope: 'user_read',
	}, (token, refresh, profile, cb) => {
		profile.token = token;
		profile.refresh = refresh;
		cb(null, profile);
	}));

	app.use(require('cookie-session')({ secret: config.session.secret }));
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
			res.status(status).json({
				error: {
					code: status,
					message: err.message,
					error: err
				}
			});
		});
	}

	if (app.get('env') === 'test') {
		app.use((err, req, res, next) => {
			const status = err.status || (isCelebrate(err) ? 400 : 500);
			if (status === 500 || isCelebrate(err))
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
	else {
		app.use(errors());
	}

	app.use((err, req, res, next) => {
		logger.error(err);

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

const express = require('express'),
	path = require('path'),
	logger = require('morgan'),
	compress = require('compression'),
	methodOverride = require('method-override'),
	passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy,
	JwtStrategy = require('passport-jwt').Strategy,
	ExtractJwt = require('passport-jwt').ExtractJwt,
	user = require('../src/models/user');

module.exports = (app, config) => {

	if (app.get('env') === 'development') {
		app.use(logger('dev'));
	}

    app.use(express.json());
    app.use(compress());
    app.use(express.static(config.root + '/public'));
    app.use(methodOverride());
	app.use(passport.initialize());

	passport.use(new SteamStrategy({
		returnURL: config.baseUrl + '/auth/steam/return',
		realm: config.baseUrl,
		apiKey: config.steam.webAPIKey
	}, (openID, profile, done) => {
		user.findOrCreate(openID, profile)
		.then((userInfo) => {
			profile = Object.assign(profile, userInfo);
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

	app.use('/example', require(config.root + '/src/routes/example'));
	app.use('/api', require(config.root + '/src/routes/api'));

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

'use strict';
const express = require('express'),
	router = express.Router(),
	passport = require('passport'),
	TwitterStrategy = require('passport-twitter').Strategy,
	config = require('../../../config/config'),
	errorCtrl = require('../../controllers/error'),
	authMiddleware = require('../../middlewares/auth'),
	authCtrl = require('../../controllers/auth');

router.route('/steam')
	.get(passport.authenticate('steam', { session: false }))
	.all(errorCtrl.send405);

router.route('/steam/return')
	.get(passport.authenticate('steam', { session: false, failureRedirect: '/' }), authCtrl.throughSteamReturn)
	.all(errorCtrl.send405);

router.route('/steam/user')
	.post(authCtrl.verifyUserTicket)
	.all(errorCtrl.send405);

router.route('/twitter')
	.get([authMiddleware.requireLoginQuery], (req, res, next) => {
		// Let's step through what we need to do to authorize accounts in a JWT ecosystem (no sessions). The JWT
		// interceptor is above, since we're creating a new window, and pass in the JWT as a query parameter (I know,
		// not the brightest but there's genuinely no good way to do it from opening a new window).
		// So first things first, we generate this strategy's name, which is unique per user.
		const stratName = 'twitter-' + req.user.id;
		// And to be a little more memory conscious, we will only create this strategy if we don't have it on record.
		if (!passport._strategies[stratName]) {
			// We create a new TwitterStrategy, using settings that we normally would for this ...
			const newTwitStrat = new TwitterStrategy({
				consumerKey: config.twitter.consumerKey,
				consumerSecret: config.twitter.consumerSecret,
				// ... Except for right here. We need to still verify which user this callback is going to be for,
				// so we're passing in the user's ID as a query parameter, in order to verify the requesting user, but
				// still meeting the correct callback URL as defined on the Twitter website. Smooth, right?
				callbackURL: config.baseUrl + '/auth/twitter/return?id=' + req.user.id,
			}, (token, tokenSecret, profile, cb) => {
				// We're still going to pack the user with the user object, to verify in the return callback that we're
				// actually authorizing who we say we are.
				profile.user = req.user;
				profile.token = token;
				profile.secret = tokenSecret;
				cb(null, profile);
			});
			// Now we use this new generated method.
			passport.use(stratName, newTwitStrat);
		}// Otherwise we can just use what they created already.

		passport.authorize(stratName)(req, res, next);
	})
	.all(errorCtrl.send405);

router.route('/twitter/return')
	.get((req, res, next) => {
		// Now, we should just try to authorize under this. If there's no query param, it'll fail.
		passport.authorize('twitter-' + req.query.id, (err, user, info) => {
			if (err)
				return next(err); // will generate a 500 error
			if (!user)
				return next(new Error('No user object!'));
			// Here's that security I was talking about earlier. We're going to make sure the request returned for
			// the user in question.
			else if (user.user && user.user.id === req.query.id) {
				// Unuse this strategy, we're done here.
				passport.unuse('twitter-' + user.user.id);
				req.account = user;
				next(null, user);
			}
		})(req, res, next)
	}, authCtrl.twitterReturn) // And last but not least, pass this through to our actual controller that generates links
	.all(errorCtrl.send405);

router.route('/discord')
	.get([authMiddleware.requireLoginQuery], (req, res, next) => {
		passport.authorize('discord', {state: req.user.id})(req, res, next);
	})
	.all(errorCtrl.send405);

router.route('/discord/return')
	.get((req, res, next) => {
		passport.authorize('discord', (err, user, info) => {
			if (err)
				return next(err); // will generate a 500 error
			if (!user)
				return next(new Error('No user object!'));
			else {
				req.userID = req.query.state;
				req.account = user;
				next(null, user);
			}
		})(req, res, next)
	}, authCtrl.discordReturn)
	.all(errorCtrl.send405);

module.exports = router;

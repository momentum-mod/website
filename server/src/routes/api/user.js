'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/user');

router.route('/')
	.get(userCtrl.get)
	.all(errorCtrl.send405);

router.route('/profile')
	.get(userCtrl.getProfile)
	.patch(userCtrl.updateProfile)
	.all(errorCtrl.send405);

router.route('/maps/submitted')
	.get(userCtrl.getSubmittedMaps)
	.all(errorCtrl.send405);

router.route('/maps/library')
	.get(userCtrl.getUserLibrary)
	.post(userCtrl.addMapToLibrary)
	.all(errorCtrl.send405);

router.route('/maps/library/:mapID')
	.get(userCtrl.isMapInLibrary)
	.delete(userCtrl.removeMapFromLibrary)
	.all(errorCtrl.send405);

router.route('/activities')
	.get(userCtrl.getActivities)
	.all(errorCtrl.send405);

router.route('/follow')
	.post(userCtrl.followUser)
	.all(errorCtrl.send405);

router.route('/follow/:userID')
	.get(userCtrl.isFollowingUser)
	.put(userCtrl.updateFollowStatus)
	.delete(userCtrl.unfollowUser)
	.all(errorCtrl.send405);

module.exports = router;

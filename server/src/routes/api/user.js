'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/user');

router.route('/')
	.get(userCtrl.get)
	.all(errorCtrl.send405);

router.route('/profile')
	.get(userCtrl.getProfile)
	.patch(userCtrl.updateProfile)
	.all(errorCtrl.send405);

router.route('/profile/social/:type')
	.delete(userCtrl.destroySocialLink)
	.all(errorCtrl.send405);

router.route('/maps/submitted')
	.get(userCtrl.getSubmittedMaps)
	.all(errorCtrl.send405);

router.route('/maps/submitted/summary')
	.get(userCtrl.getSubmittedMapSummary)
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

router.route('/activities/followed')
	.get(userCtrl.getFollowedActivities)
	.all(errorCtrl.send405);

router.route('/follow')
	.post(userCtrl.followUser)
	.all(errorCtrl.send405);

router.route('/follow/:userID')
	.get(userCtrl.checkFollowStatus)
	.patch(userCtrl.updateFollowStatus)
	.delete(userCtrl.unfollowUser)
	.all(errorCtrl.send405);

router.route('/notifications')
	.get(userCtrl.getNotifications)
	.all(errorCtrl.send405);

router.route('/notifications/:notifID')
	.patch(userCtrl.updateNotification)
	.delete(userCtrl.deleteNotification)
	.all(errorCtrl.send405);

module.exports = router;

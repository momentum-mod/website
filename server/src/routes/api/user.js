'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	userValidation = require('../../validations/user'),
	mapsValidation = require('../../validations/maps'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/user');

router.route('/')
	.get(validate(userValidation.get), userCtrl.get)
	.patch(validate(userValidation.update), userCtrl.update)
	.all(errorCtrl.send405);

router.route('/profile')
	.get(userCtrl.getProfile)
	.all(errorCtrl.send405);

router.route('/profile/social/:type')
	.delete(validate(userValidation.destroySocialLink), userCtrl.destroySocialLink)
	.all(errorCtrl.send405);

router.route('/maps/credits')
	.get(userCtrl.getMapCredits)
	.all(errorCtrl.send405);

router.route('/maps/submitted')
	.get(validate(userValidation.getSubmittedMaps), userCtrl.getSubmittedMaps)
	.all(errorCtrl.send405);

router.route('/maps/submitted/summary')
	.get(userCtrl.getSubmittedMapSummary)
	.all(errorCtrl.send405);

router.route('/maps/library')
	.get(validate(userValidation.getMapLibrary), userCtrl.getUserLibrary)
	.all(errorCtrl.send405);

router.route('/maps/library/:mapID')
	.get(userCtrl.isMapInLibrary)
	.put(userCtrl.addMapToLibrary)
	.delete(userCtrl.removeMapFromLibrary)
	.all(errorCtrl.send405);

router.route('/maps/favorites')
	.get(validate(userValidation.getUserFavorites), userCtrl.getUserFavorites)
	.all(errorCtrl.send405);

router.route('/maps/favorites/:mapID')
	.get(userCtrl.getUserFavorite)
	.put(userCtrl.addMapToFavorites)
	.delete(userCtrl.removeMapFromFavorites)
	.all(errorCtrl.send405);

router.route('/activities')
	.get(validate(userValidation.getActivities), userCtrl.getActivities)
	.all(errorCtrl.send405);

router.route('/activities/followed')
	.get(validate(userValidation.getFollowedActivities), userCtrl.getFollowedActivities)
	.all(errorCtrl.send405);

router.route('/follow')
	.post(validate(userValidation.followUser), userCtrl.followUser)
	.all(errorCtrl.send405);

router.route('/follow/:userID')
	.get(userCtrl.checkFollowStatus)
	.patch(validate(userValidation.updateFollowStatus), userCtrl.updateFollowStatus)
	.delete(userCtrl.unfollowUser)
	.all(errorCtrl.send405);

router.route('/notifications')
	.get(validate(userValidation.getNotifications), userCtrl.getNotifications)
	.all(errorCtrl.send405);

router.route('/notifications/:notifID')
	.patch(validate(userValidation.updateNotification), userCtrl.updateNotification)
	.delete(userCtrl.deleteNotification)
	.all(errorCtrl.send405);

router.param('mapID', validate(mapsValidation.urlParamID));
router.param('notifID', validate(userValidation.notifID));

module.exports = router;

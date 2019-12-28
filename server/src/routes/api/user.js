'use strict';
const express = require('express'),
	router = express.Router(),
	{ celebrate } = require('celebrate'),
	userValidation = require('../../validations/user'),
	mapsValidation = require('../../validations/maps'),
	errorCtrl = require('../../controllers/error'),
	userCtrl = require('../../controllers/user');

router.route('/')
	.get(celebrate(userValidation.get), userCtrl.get)
	.patch(celebrate(userValidation.update), userCtrl.update)
	.all(errorCtrl.send405);

router.route('/profile')
	.get(userCtrl.getProfile)
	.all(errorCtrl.send405);

router.route('/profile/social/:type')
	.delete(celebrate(userValidation.destroySocialLink), userCtrl.destroySocialLink)
	.all(errorCtrl.send405);

router.route('/maps/credits')
	.get(userCtrl.getMapCredits)
	.all(errorCtrl.send405);

router.route('/maps/submitted')
	.get(celebrate(userValidation.getSubmittedMaps), userCtrl.getSubmittedMaps)
	.all(errorCtrl.send405);

router.route('/maps/submitted/summary')
	.get(userCtrl.getSubmittedMapSummary)
	.all(errorCtrl.send405);

router.route('/maps/library')
	.get(celebrate(userValidation.getMapLibrary), userCtrl.getUserLibrary)
	.all(errorCtrl.send405);

router.route('/maps/library/:mapID')
	.get(userCtrl.isMapInLibrary)
	.put(userCtrl.addMapToLibrary)
	.delete(userCtrl.removeMapFromLibrary)
	.all(errorCtrl.send405);

router.route('/maps/favorites')
	.get(celebrate(userValidation.getUserFavorites), userCtrl.getUserFavorites)
	.all(errorCtrl.send405);

router.route('/maps/favorites/:mapID')
	.get(userCtrl.getUserFavorite)
	.put(userCtrl.addMapToFavorites)
	.delete(userCtrl.removeMapFromFavorites)
	.all(errorCtrl.send405);

router.route('/activities')
	.get(celebrate(userValidation.getActivities), userCtrl.getActivities)
	.all(errorCtrl.send405);

router.route('/activities/followed')
	.get(celebrate(userValidation.getFollowedActivities), userCtrl.getFollowedActivities)
	.all(errorCtrl.send405);

router.route('/follow')
	.post(celebrate(userValidation.followUser), userCtrl.followUser)
	.all(errorCtrl.send405);

router.route('/follow/:userID')
	.get(userCtrl.checkFollowStatus)
	.patch(celebrate(userValidation.updateFollowStatus), userCtrl.updateFollowStatus)
	.delete(userCtrl.unfollowUser)
	.all(errorCtrl.send405);

router.route('/notifications')
	.get(celebrate(userValidation.getNotifications), userCtrl.getNotifications)
	.all(errorCtrl.send405);

router.route('/notifications/:notifID')
	.patch(celebrate(userValidation.updateNotification), userCtrl.updateNotification)
	.delete(userCtrl.deleteNotification)
	.all(errorCtrl.send405);

router.param('mapID', celebrate(mapsValidation.mapsURLParamsValidation));
router.param('notifID', celebrate(userValidation.notifID));

module.exports = router;

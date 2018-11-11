'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	mapCtrl = require('../../controllers/maps');

router.route('/')
	.get(mapCtrl.getAll)
	.post(mapCtrl.create)
	.all(errorCtrl.send405);

router.route('/:mapID')
	.get(mapCtrl.get)
	.patch(mapCtrl.update)
	.all(errorCtrl.send405);

router.route('/:mapID/info')
	.get(mapCtrl.getInfo)
	.patch(mapCtrl.updateInfo)
	.all(errorCtrl.send405);

router.route('/:mapID/credits')
	.get(mapCtrl.getCredits)
	.post(mapCtrl.createCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/credits/:mapCredID')
	.get(mapCtrl.getCredit)
	.patch(mapCtrl.updateCredit)
	.delete(mapCtrl.deleteCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/avatar')
	.put(mapCtrl.updateAvatar)
	.all(errorCtrl.send405);

router.route('/:mapID/download')
	.get(mapCtrl.download)
	.all(errorCtrl.send405);

router.route('/:mapID/upload')
	.get(mapCtrl.getUploadLocation)
	.post(mapCtrl.upload)
	.all(errorCtrl.send405);

module.exports = router;

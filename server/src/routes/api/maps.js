'use strict';
const express = require('express'),
	router = express.Router(),
	errorCtrl = require('../../controllers/error'),
	mapCtrl = require('../../controllers/maps'),
	runsCtrl = require('../../controllers/runs'),
	bodyParser = require('body-parser');

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

router.route('/:mapID/images')
	.get(mapCtrl.getImages)
	.post(mapCtrl.createImage)
	.all(errorCtrl.send405);

router.route('/:mapID/images/:imgID')
	.get(mapCtrl.getImage)
	.put(mapCtrl.updateImage)
	.delete(mapCtrl.deleteImage)
	.all(errorCtrl.send405);

router.route('/:mapID/runs')
	// 80 MB is the upper bound limit of ~10 hours of replay file
	.post([[bodyParser.raw({limit: '80mb'})]], runsCtrl.create)
	.get(runsCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:mapID/runs/:runID')
	.get(runsCtrl.getByID)
	.all(errorCtrl.send405);

router.route('/:mapID/runs/:runID/download')
	.get(runsCtrl.download)
	.all(errorCtrl.send405);

module.exports = router;

'use strict';
const express = require('express'),
	router = express.Router(),
	validate = require('express-validation'),
	mapsValidation = require('../../validations/maps'),
	runsValidation = require('../../validations/runs'),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	mapCtrl = require('../../controllers/maps'),
	runsCtrl = require('../../controllers/runs'),
	bodyParser = require('body-parser');

router.route('/')
	.get(validate(mapsValidation.getAll), mapCtrl.getAll)
	.post([authMiddleware.requireMapper, validate(mapsValidation.create)], mapCtrl.create)
	.all(errorCtrl.send405);

router.route('/:mapID')
	.get(validate(mapsValidation.get), mapCtrl.get)
	.patch([authMiddleware.requireMapper, validate(mapsValidation.update)], mapCtrl.update)
	.all(errorCtrl.send405);

router.route('/:mapID/info')
	.get(mapCtrl.getInfo)
	.patch([authMiddleware.requireMapper, validate(mapsValidation.updateInfo)], mapCtrl.updateInfo)
	.all(errorCtrl.send405);

router.route('/:mapID/zones')
	.get(mapCtrl.getZones)
	.all(errorCtrl.send405);

router.route('/:mapID/credits')
	.get(validate(mapsValidation.getCredits), mapCtrl.getCredits)
	.post([authMiddleware.requireMapper, validate(mapsValidation.createCredit)], mapCtrl.createCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/credits/:mapCredID')
	.get(validate(mapsValidation.getCredit), mapCtrl.getCredit)
	.patch([authMiddleware.requireMapper, validate(mapsValidation.updateCredit)], mapCtrl.updateCredit)
	.delete(authMiddleware.requireMapper, mapCtrl.deleteCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/thumbnail')
	.put(authMiddleware.requireMapper, mapCtrl.updateThumbnail)
	.all(errorCtrl.send405);

router.route('/:mapID/download')
	.get(mapCtrl.download)
	.all(errorCtrl.send405);

router.route('/:mapID/upload')
	.get(mapCtrl.getUploadLocation)
	.post(authMiddleware.requireMapper, mapCtrl.upload)
	.all(errorCtrl.send405);

router.route('/:mapID/images')
	.get(mapCtrl.getImages)
	.post(authMiddleware.requireMapper, mapCtrl.createImage)
	.all(errorCtrl.send405);

router.route('/:mapID/images/:imgID')
	.get(mapCtrl.getImage)
	.put(authMiddleware.requireMapper, mapCtrl.updateImage)
	.delete(authMiddleware.requireMapper, mapCtrl.deleteImage)
	.all(errorCtrl.send405);

router.route('/:mapID/runs')
	// 80 MB is the upper bound limit of ~10 hours of replay file
	.post([[bodyParser.raw({limit: '80mb'})]], runsCtrl.create)
	.get(validate(runsValidation.getAll), runsCtrl.getAll)
	.all(errorCtrl.send405);

router.route('/:mapID/runs/:runID')
	.get(validate(runsValidation.getAll), runsCtrl.getByID)
	.all(errorCtrl.send405);

router.route('/:mapID/runs/:runID/download')
	.get(runsCtrl.download)
	.all(errorCtrl.send405);

router.param('mapID', validate(mapsValidation.urlParamID));
router.param('mapCredID', validate(mapsValidation.urlParamCredID));
router.param('imgID', validate(mapsValidation.urlParamImgID));
router.param('runID', validate(runsValidation.urlParamID));

module.exports = router;

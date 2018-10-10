'use strict';
const express = require('express'),
	router = express.Router(),
	authMiddleware = require('../../middlewares/auth'),
	errorCtrl = require('../../controllers/error'),
	mapCtrl = require('../../controllers/maps');

router.route('/')
	.get(mapCtrl.getAll)
	.post([authMiddleware.requireLogin], mapCtrl.create)
	.all(errorCtrl.send405);

router.route('/:mapID')
	.get(mapCtrl.get)
	.patch([authMiddleware.requireLogin], mapCtrl.update)
	.all(errorCtrl.send405);

router.route('/:mapID/info')
	.get(mapCtrl.getInfo)
	.patch([authMiddleware.requireLogin], mapCtrl.updateInfo)
	.all(errorCtrl.send405);

router.route('/:mapID/credits')
	.get(mapCtrl.getCredits)
	.post([authMiddleware.requireLogin], mapCtrl.createCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/credits/:mapCredID')
	.get(mapCtrl.getCredit)
	.patch([authMiddleware.requireLogin], mapCtrl.updateCredit)
	.delete([authMiddleware.requireLogin], mapCtrl.deleteCredit)
	.all(errorCtrl.send405);

router.route('/:mapID/download')
	.get(mapCtrl.download)
	.all(errorCtrl.send405);

router.route('/:mapID/upload')
	.post([authMiddleware.requireLogin], mapCtrl.upload)
	.all(errorCtrl.send405);

module.exports = router;

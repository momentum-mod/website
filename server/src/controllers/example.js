'use strict';
const express = require('express'),
    router = express.Router(),
	example = require('../models/example');

module.exports = {

	example: (req, res, next) => {
		res.send(example.helloWorld());
		console.log("Hello World!");
	}

}

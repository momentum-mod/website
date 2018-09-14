const express = require('express'),
	config = require('./config/config'),
	http = require('http'),
	path = require('path'),
	app = express();

require('./config/express')(app, config);

const server = http.createServer(app);
server.listen(config.port, '0.0.0.0');

const httpApp = express();
const httpRouter = express.Router();

module.exports = server;

const express = require('express'),
	config = require('./config/config'),
	http = require('http'),
	path = require('path'),
	app = express();

require('./config/swagger');
require('./config/express')(app, config);

const server = http.createServer(app);
server.listen(config.port, '0.0.0.0');

module.exports = server;

const express = require('express'),
	path = require('path'),
	logger = require('morgan'),
	compress = require('compression'),
	methodOverride = require('method-override');

module.exports = (app, config) => {

	if (app.get('env') === 'developement') {
		app.use(logger('dev'));
	}

    app.use(express.json());
    app.use(compress());
    app.use(express.static(config.root + '/public'));
    app.use(methodOverride());

	app.use('/example', require(config.root + '/src/routes/example'));

    app.use('*', (req, res, next) => {
		try {
        	res.sendFile(path.resolve(config.root + '/public/index.html'));
		} catch(next) {
			next(err);
		}
    });

	if (app.get('env') === 'development') {
		app.use((err, req, res, next) => {
			const status = err.status || 500;
			res.status(status).json({
				error: {
					code: status,
					message: err.message,
					error: err
				}
			});
	    });
	}

	app.use((err, req, res, next) => {
		const status = err.status || 500;
		res.status(status).json({
			error: {
				code: status,
				message: err.status === 500 ?
					'Internal Server Error' : err.message
			}
		});
    });

};

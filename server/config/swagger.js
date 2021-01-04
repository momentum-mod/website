const swaggerAutogen = require('swagger-autogen')();
const path = require('path');

const outputFile = path.join(__dirname, 'swagger_output.json');
const routesPath = path.join(__dirname, '..', 'src', 'routes');
const endpointsFiles = [
	routesPath + "/api/404.js",
	routesPath + "/api/activities.js",
	routesPath + "/api/admin.js",
	routesPath + "/api/index.js",
	routesPath + "/api/maps.js",
	routesPath + "/api/reports.js",
	routesPath + "/api/runs.js",
	routesPath + "/api/stats.js",
	routesPath + "/api/user.js",
	routesPath + "/api/users.js",
	routesPath + "/auth/index.js"
];

swaggerAutogen(outputFile, endpointsFiles).then(() => {
	require('../server.js')
});

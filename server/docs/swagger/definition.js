module.exports = {
  "swagger": "2.0",
	"info": {
		"version": "1.0.0",
		"title": "Server API Reference",
		"description": "",
		"license": {
			"name": "MIT",
			"url": "https://opensource.org/licenses/MIT"
		}
	},
	"host": "localhost:3002",
	"basePath": "/api",
  "tags": [
      {
        "name": "auth",
        "description": "API for authenticating with the system"
      },
      {
        "name": "user",
        "description": "API for the authenticated user in the system"
      },
      {
        "name": "users",
        "description": "API for users in the system"
      },
      {
        "name": "maps",
        "description": "API for maps in the system"
      },
      {
        "name": "runs",
        "description": "API for runs in the system"
      },
      {
        "name": "leaderboards",
        "description": "API for leaderboards in the system"
      },
      {
        "name": "activities",
        "description": "API for activities in the system"
      },
      {
        "name": "admin",
        "description": "API for administrating resources in the system"
      }
    ],
    "schemes": [
      "http"
    ],
    "consumes": [
      "application/json"
    ],
    "produces": [
      "application/json"
    ]
};

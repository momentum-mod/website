class ServerError extends Error {

	constructor(status, message) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.status = status;
	}

}

module.exports = ServerError;

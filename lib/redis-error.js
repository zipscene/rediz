// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');

/**
 * Error class for errors from redis.  Constructor takes same arguments as XError.
 *
 * @class RedisError
 * @constructor
 */
class RedisError extends XError {

	constructor(...args) {
		super(...args);
	}

	/**
	 * Converts a redis client error into a RedisError.
	 *
	 * @method fromRedisClientError
	 * @static
	 * @param {Object} err - Error from the redis client
	 * @return {RedisError}
	 */
	static fromRedisClientError(err) {
		return new RedisError(XError.REDIS_ERROR, err.message);
	}

}

// Register the XError code with default message
XError.registerErrorCode('redis_error', {
	message: 'Internal database error',
	http: 500
});

module.exports = RedisError;

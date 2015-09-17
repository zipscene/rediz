const redis = require('redis');
const RedisClient = redis.RedisClient;
const EventEmitter = require('events').EventEmitter;
const ClusterClient = require('zs-volatile-redis-cluster');
const XError = require('xerror');
const _ = require('lodash');
const RedisError = require('./redis-error');

/**
 * Common base class for RedizClient and RedizShardClient.
 *
 * @class RedisClientCommon
 */
class RedisClientCommon extends EventEmitter {

	/**
	 * Listens to redis events on the given client and re-emits them on `this`.
	 *
	 * @method _proxyRedisEvents
	 * @private
	 * @param {RedisClient} client
	 */
	_proxyRedisEvents(client) {
		client.on('error', (err) => {
			if (!XError.isXError(err)) {
				return new XError(err);
			}
			this.emit('error', err);
		});
	}

	/**
	 * Copies functions on the given redis client to `this`.  Also converts them to being
	 * promise-based instead of callback-based, and always error with XError.
	 *
	 * @method _proxyClientFuncs
	 * @private
	 * @param {Promise{RedisClient}} clientPromise
	 */
	_proxyClientFuncs(clientPromise) {
		// Proxy each function
		_.forEach(RedisClientCommon.redisFuncNames, (funcName) => {
			if (this[funcName]) { return; }
			this[funcName] = (...args) => {
				// Wait for client to become available
				return clientPromise.then((client) => new Promise((resolve, reject) => {
					// Append a callback as the last argument and return a promise.
					client[funcName](...args, (err, result) => {
						// Convert errors to XError's
						if (err) { return reject(RedisError.fromRedisClientError(err)); }
						resolve(result);
					});
				}));
			};
		});
	}

	registerScript(name, scriptText, options = {}) {

	}

	registerScriptFile(filename) {

	}

	registerScriptDir(dirname) {

	}

}

// Generate a list of functions on the redis client prototype
RedisClientCommon.redisFuncNames = [];
for (let key in RedisClient.prototype) {
	if (_.isFunction(RedisClient.prototype[key])) {
		RedisClientCommon.redisFuncNames.push(key);
	}
}

module.exports = RedisClientCommon;

// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const _ = require('lodash');
const Profiler = require('simprof');
const RedisError = require('./redis-error');
const RedisClientCommon = require('./redis-client-common');
const pasync = require('pasync');

const profiler = new Profiler('RedizPromiseWrapper');

/**
 * Class that pretends to be a redis client and buffers requests until the actual redis client
 * becomes available via a promise.
 *
 * @class RedizPromiseWrapper
 */
class RedizPromiseWrapper extends RedisClientCommon {

	/**
	 * @constructor
	 * @param {Promise{RedisClient}} redisClientPromise - Promise that resolves when the actual
	 *   redis client is available.
	 * @param {Object} [registeredScripts] - Registered scripts to copy over.
	 */
	constructor(redisClientPromise, registeredScripts = {}) {
		super();
		this.redisClientPromise = redisClientPromise;
		this.registeredScripts = registeredScripts;
		this.registerScriptWaiter = pasync.waiter();
		redisClientPromise.then((client) => {
			if (client._scriptsRegistered) {
				this.registerScriptWaiter.resolve();
			} else {
				this._registerAllScriptsToClient()
					.then(() => {
						client._scriptsRegistered = true;
						this.registerScriptWaiter.resolve();
					}, (err) => {
						this.registerScriptWaiter.reject(err);
					});
			}
		}, (err) => {
			this.registerScriptWaiter.reject(err);
		});
	}

}

// Append prototype functions that match the actual redis client's prototype functions
_.forEach(RedisClientCommon.redisFuncNames, (funcName) => {
	if (!RedizPromiseWrapper.prototype[funcName]) {
		// Intentionally not an array function so `this` is bound to the object
		RedizPromiseWrapper.prototype[funcName] = function(...args) {

			const runFunc = () => {
				let prof = profiler.begin(`#${funcName}`);
				return this.redisClientPromise.then((client) => new Promise((resolve, reject) => {
					// Append a callback as the last argument and return a promise.
					client[funcName](...args, (err, result) => {
						// Convert errors to XError's
						if (err) { return reject(RedisError.fromRedisClientError(err)); }

						prof.end();
						resolve(result);
					});
				}));
			};

			if (funcName === 'script' && args[0] === 'load') {
				return runFunc();
			} else {
				return this.registerScriptWaiter.promise.then(runFunc);
			}

		};
	}
});

module.exports = RedizPromiseWrapper;

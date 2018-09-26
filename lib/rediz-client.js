// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const redis = require('redis');
const ClusterClient = require('volatile-redis-cluster');
const _ = require('lodash');
const pasync = require('pasync');
const XError = require('xerror');
const Profiler = require('simprof');
const RedisError = require('./redis-error');
const RedisClientCommon = require('./redis-client-common');

const profiler = new Profiler('RedizClient');

/**
 * This class is a wrapper around the standard node redis client that supports using
 * volatilerediscluster as well as stored functions, and operates with promises instead
 * of callbacks.
 *
 * @class RedizClient
 */
class RedizClient extends RedisClientCommon {

	/**
	 * @constructor
	 * @param {Object} [config]
	 *   @param {String} [config.host='localhost'] - The redis host (if clustered, the master host)
	 *   @param {Number} [config.port=6379] - The redis port to connect to (if clustered, the master port)
	 *   @param {Boolean} [config.volatileCluster=false] - If true, operate as a volatilerediscluster client
	 */
	constructor(config = {}) {
		super();
		this.redizConfig = config;
		if (config.volatileCluster) {
			// Operating as a cluster, so initialize the cluster
			this.clusterClient = new ClusterClient(config);
			this.redisClient = this.clusterClient.coordClientMain;
			this._proxyRedisEvents(this.clusterClient);
		} else {
			// Not operating as a cluster, just initialize a standalone client
			this.redisClient = redis.createClient(config.port, config.host, config);
			this._proxyRedisEvents(this.redisClient);
		}

		// This is a map from node names to instances of RedizPromiseWrapper
		this.shardClientMap = {};
	}

	/**
	 * Returns another RedizClient that corresponds to a single shard.  For example:
	 * `rediz.shard('myKey').get('myKey').then(...)` .
	 *
	 * @method shard
	 * @param {String} shardKey - The key to shard on.  This is hashed, so the value doesn't matter
	 *   other than it must be consistent across accesses to the same redis key to ensure it gets
	 *   directed to the same shard.
	 * @param {Object} [shardOptions] - Options relating to sharding
	 *   @param {Number} [shardOptions.downNodeExpiry=0] - If set, this is the assumed expiry time,
	 *     in seconds, for all keys on a downed shard.  If a shard goes down, and access is
	 *     attempted to any key on the shard within this period of time, a 'Shard unavailable'
	 *     error is returned.
	 * @return {RedisClientCommon} - A version of the RedizClient corresponding to the particular
	 *   shard.
	 */
	shard(shardKey, shardOptions = {}) {
		// If not operating in sharded mode, send all requests to the master
		if (!this.clusterClient) {
			return this;
		}

		let prof = profiler.begin('#shard');

		// For circular dependencies
		const RedizPromiseWrapper = require('./rediz-promise-wrapper');

		// Construct a RedizPromiseWrapper which acts as a passthrough once we know information
		// about the shard.
		let promiseClient = new RedizPromiseWrapper(new Promise((resolve, reject) => {
			this.clusterClient.getShardClient(shardKey, shardOptions, (err, client, node) => {
				if (err) { return reject(new XError(XError.REDIS_ERROR, 'Error getting shard client')); }
				if (!client) { return reject(new XError(XError.REDIS_ERROR, 'Shard unavailable')); }
				let name = node.name;
				if (!this.shardClientMap[name]) {
					// Initialize the newly created shard client
					// Call this asynchronously to prevent race conditions with promiseClient
					// not being defined.
					setImmediate(() => {
						this.shardClientMap[name] = promiseClient;
						this._proxyRedisEvents(client);
						prof.end();
						resolve(client);
					});
				} else {
					prof.end();
					resolve(client);
				}
			});
		}), this.registeredScripts);

		return promiseClient;
	}

	registerScript(name, scriptText, options = {}) {
		return super.registerScript(name, scriptText, options)
			.then(() => {
				// Also register this script with all shard clients already initialized
				return pasync.each(_.values(this.shardClientMap), (shardClient) => {
					return shardClient.registerScript(name, scriptText, options);
				});
			});
	}

	disconnect(flush=true) {
		if (this.redizConfig.volatileCluster) {
			this.clusterClient.disconnect(flush);
		} else {
			this.redisClient.end(flush);
		}
	}

	getNumShards() {
		if (this.clusterClient) {
			return this.clusterClient.consistentHash.numUpNodes;
		} else {
			return 1;
		}
	}

	async flushAllShards() {
		if (this.redizConfig.volatileCluster) {
			// Delete all keys on the master except the cluster control key
			let keys = await this.keys('*');
			for (let key of keys) {
				if (key !== 'rvolcluster:nodeset') {
					await this.del(key);
				}
			}
			
			// Flush all the slaves
			for (let i = 0; i < this.getNumShards(); ++i) {
				await this.shard(i).flushdb();
			}
		} else {
			await this.flushdb();
		}

	}

}

// Append prototype functions that match the actual redis client's prototype functions
_.forEach(RedisClientCommon.redisFuncNames, (funcName) => {
	if (!RedizClient.prototype[funcName]) {
		// Intentionally not an array function so `this` is bound to the object
		RedizClient.prototype[funcName] = function(...args) {
			let prof = profiler.begin(`#${funcName}`);

			return new Promise((resolve, reject) => {
				// Append a callback as the last argument and return a promise.
				this.redisClient[funcName](...args, (err, result) => {
					// Convert errors to XError's
					if (err) { return reject(RedisError.fromRedisClientError(err)); }

					prof.end();
					resolve(result);
				});
			});
		};
	}
});

module.exports = RedizClient;

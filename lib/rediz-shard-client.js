const redis = require('redis');
const EventEmitter = require('events').EventEmitter;
const ClusterClient = require('zs-volatile-redis-cluster');
const XError = require('xerror');
const _ = require('lodash');
const RedisError = require('./redis-error');
const RedisClientCommon = require('./redis-client-common');

/**
 * Redis client class that hooks to a single shard.
 *
 * @class RedizShardClient
 */
class RedizShardClient extends RedisClientCommon {

	/**
	 * @constructor
	 * @param {Promise{Object}} shardInfoPromise - Promise that resolves with shard information
	 *   @param {Object|null} shardInfoPromise.config - Configuration for shard client
	 *     @param {String} shardInfoPromise.config.host
	 *     @param {Number} shardInfoPromise.config.port
	 *   @param {Object|null} shardInfoPromise.node - Node information for the shard
	 */
	constructor(shardInfoPromise) {

	}

}

module.exports = RedizShardClient;

const redis = require('redis');
const EventEmitter = require('events').EventEmitter;
const ClusterClient = require('zs-volatile-redis-cluster');
const XError = require('xerror');
const _ = require('lodash');
const RedisError = require('./redis-error');
const RedisClientCommon = require('./redis-client-common');

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
		if (config.volatileCluster) {
			this.clusterClient = new ClusterClient(config);
			this.redisClient = this.clusterClient.coordClientMain;
			this._proxyRedisEvents(this.clusterClient);
		} else {
			this.redisClient = redis.createClient(config.port, config.host, config);
			this._proxyRedisEvents(this.redisClient);
		}
		this._proxyClientFuncs(Promise.resolve(this.redisClient));
	}

	shard(shardKey, shardOptions) {
		this.clusterClient.getShardClientConfig()
	}

	registerScript(name, scriptText, options = {}) {

	}

	registerScriptFile(filename) {

	}

	registerScriptDir(dirname) {

	}

}

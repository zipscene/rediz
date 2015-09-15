const redis = require('redis');

/**
 * This class is a wrapper around the standard node redis client that supports using
 * volatilerediscluster as well as stored functions, and operates with promises instead
 * of callbacks.
 *
 * @class RedizClient
 */
class RedizClient {

	/**
	 * @constructor
	 * @param {Object} [config]
	 *   @param {String} [config.host='localhost'] - The redis host (if clustered, the master host)
	 *   @param {Number} [config.port=6379] - The redis port to connect to (if clustered, the master port)
	 *   @param {Boolean} [config.volatileCluster=false] - If true, operate as a volatilerediscluster client
	 */
	constructor(config = {}) {

	}

	registerScript(name, scriptText, options = {}) {

	}

	registerScriptFile(filename) {

	}

	registerScriptDir(dirname) {

	}

	shard(shardKey, shardOptions) {

	}

}

const redis = require('redis');
const RedisClient = redis.RedisClient;
const EventEmitter = require('events').EventEmitter;
const XError = require('xerror');
const _ = require('lodash');
const RedisError = require('./redis-error');
const fsp = require('fs-promise');
const path = require('path');
const pasync = require('pasync');

/**
 * Common base class for RedizClient and RedizShardClient.
 *
 * @class RedisClientCommon
 */
class RedisClientCommon extends EventEmitter {

	constructor() {
		super();
		// Map from registered script name to objects like ` { scriptText: String, options: Object, sha: String }`
		this.registeredScripts = {};
	}

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
	 * Sends all registered scripts to this client.
	 *
	 * @method _registerAllScriptsToClient
	 * @protected
	 * @return {Promise}
	 */
	_registerAllScriptsToClient() {
		return pasync.eachSeries(_.keys(this.registeredScripts), (scriptName) => {
			this._registerScriptToClient(scriptName);
		});
	}

	/**
	 * Registers the given script (by name) to this client.
	 *
	 * @method _registerScriptToClient
	 * @protected
	 * @param {String} scriptName
	 * @return {Promise}
	 */
	_registerScriptToClient(scriptName) {
		let script = this.registeredScripts[scriptName];
		return this.script('load', script.scriptText)
			.then((sha) => {
				script.sha = sha;
			});
	}

	/**
	 * Register a single stored redis script (LUA) with the client.
	 *
	 * @method registerScript
	 * @param {String} name - Function name to call the script by.
	 * @param {String} scriptText - The string contents of the script.
	 * @param {Object} [options] - Additional options regarding script creation.
	 *   @param {Number} [options.numKeyArgs] - If the script does not contain any hints as to its
	 *     number of key arguments, this must be supplied.  It is the number of arguments to the
	 *     script that are considered to be redis keys.  If this is not supplied, this function
	 *     will look at the first line of the script.  If the first line is in the form:
	 *     `local numKeyArgs = 4`, this value (4) is taken to be the number of key arguments.
	 * @return {Promise}
	 */
	registerScript(name, scriptText, options = {}) {
		if (options.numKeyArgs === undefined) {
			// Try to guess at the number of key args based on a special line in the script
			let lines = scriptText.split('\n');
			let matches = /^local numKeyArgs = ([0-9]+)/.exec(lines[0]);
			if (matches) {
				options.numKeyArgs = parseInt(matches[1], 10);
			} else {
				options.numKeyArgs = 0;
			}
		}
		this.registeredScripts[name] = {
			scriptText,
			options
		};
		return this._registerScriptToClient(name);
	}

	/**
	 * Loads a script from a file.
	 *
	 * @method registerScriptFile
	 * @param {String} name - Script name
	 * @param {String} filename
	 * @return {Promise}
	 */
	registerScriptFile(name, filename) {
		return Promise.resolve()
			.then(() => fsp.readFile(filename, { encoding: 'utf8' }))
			.then((text) => this.registerScript(name, text));
	}

	/**
	 * Registers a directory full of redis scripts named *.lua .
	 *
	 * @method registerScriptDir
	 * @param {String} dirname
	 * @return {Promise}
	 */
	registerScriptDir(dirname) {
		return Promise.resolve()
			.then(() => fsp.readdir(dirname))
			.then((files) => pasync.eachSeries(files, (filename) => {
				return Promise.resolve()
					.then(() => fsp.stat(path.join(dirname, filename)))
					.then((stats) => {
						if (stats.isFile() && filename.slice(-4) === '.lua') {
							let scriptName = filename.slice(0, -4);
							return this.registerScriptFile(scriptName, path.join(dirname, filename));
						}
					});
			}));
	}

	/**
	 * Runs a redis stored script by name.
	 *
	 * @method runScript
	 * @param {String} name - Name of the script
	 * @param {Mixed[]} ...args - Arguments to the script
	 * @return {Promise} - Resolves with the result of `eval()` .
	 */
	runScript(name, ...args) {
		let script = this.registeredScripts[name];
		if (!script) throw new XError(XError.INTERNAL_ERROR, 'No such redis script: ' + name);
		if (script.sha) {
			return this.evalsha(script.sha, script.numKeyArgs || 0, ...args);
		} else {
			return this.eval(script.scriptText, script.numKeyArgs || 0, ...args);
		}
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

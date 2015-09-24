let expect = require('chai').expect;
let RedizClient = require('../lib/rediz-client');
const ClusterClient = require('zs-volatile-redis-cluster');
const redis = require('redis');
const RedizPromiseWrapper = require('../lib/rediz-promise-wrapper');
const RedisCommonClient = require('../lib/redis-client-common');

describe('Rediz Client', () => {

	describe('constructor', () => {

		describe('non-volatile Cluster', () => {
			it('should create a redis client and not a clusterClient', (done) => {
				let config = {
					host: 'localhost',
					port: '8080',
					volatileCluster: false
				};
				let client = new RedizClient(config);
				expect(client.registeredScripts).to.exist;
				expect(client.registeredScripts).to.be.an('object');
				expect(client.registeredScripts).to.be.empty;
				expect(client.redisClient).to.exist;
				expect(client.shardClientMap).to.exist;
				expect(client.shardClientMap).to.be.empty;
				expect(client.shardClientMap).to.be.an('object');
				expect(client.clusterClient).to.not.exist;
				done();
			});

			it('should be able to use standard redis commands', () => {
				let config = {
					host: 'localhost',
					port: '6379',
					volatileCluster: false
				};
				let client = new RedizClient(config);
				let key = 'foo';
				let value = 'bar';
				return client.set(key, value)
					.then( () => client.get(key) )
					.then( (result) => expect(result).to.equal(value));
			});
		});

		describe('volatile Cluster', () => {
			it('should create a redis client and a clusterClient', (done) => {
				let config = {
					host: 'localhost',
					port: '6379',
					volatileCluster: true
				};
				let client = new RedizClient(config);
				expect(client.registeredScripts).to.exist;
				expect(client.registeredScripts).to.be.an('object');
				expect(client.registeredScripts).to.be.empty;
				expect(client.redisClient).to.exist;
				expect(client.clusterClient).to.exist;
				expect(client.clusterClient).to.be.an.instanceof(ClusterClient);
				expect(client.shardClientMap).to.exist;
				expect(client.shardClientMap).to.be.empty;
				expect(client.shardClientMap).to.be.an('object');
				done();
			});

			it('should be able to use standard redis commands', () => {
				let config = {
					host: 'localhost',
					port: '6379',
					volatileCluster: true
				};
				let client = new RedizClient(config);
				let key = 'foo';
				let value = 'bar';
				return client.set(key, value)
					.then( () => client.get(key) )
					.then( (result) => expect(result).to.equal(value));
			});
		});

	});

	describe('#shard', () => {

		describe('non-volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: false
			};
			let client = new RedizClient(config);
			it('should return the redis common client corresponding to the shard', (done) => {
				let shard = client.shard('myKey');
				expect(shard).to.exist;
				expect(shard).to.be.an.instanceof(RedisCommonClient);
				expect(shard.registeredScripts).to.exist;
				expect(shard.registeredScripts).to.be.empty;
				done();
			});
			it('should be able to use standard redis commands', () => {
				let shard = client.shard('myKey');
				let key = 'foo';
				let value = 'bar';
				return shard.set(key, value)
					.then( () => shard.get(key) )
					.then( (result) => expect(result).to.equal(value));
			});
		});

		describe('volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '8080',
				volatileCluster: true
			};
			let client = new RedizClient(config);

			it('should return the redis common client corresponding to the shard', (done) => {
				let shard = client.shard('myKey');
				expect(shard).to.exist;
				expect(shard).to.be.an.instanceof(RedizPromiseWrapper);
				done();
			});
		});
	});

	describe('#registerScript', () => {
		describe('non-volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: false
			};
			let client = new RedizClient(config);

			it('should register a script', () => {
				let scriptText = 'local numKeyArgs = 2\n\r' +
					'redis.call("set", KEYS[1], ARGV[1])\n\r' +
					'redis.call("incr", KEYS[1])\n\r' +
					'local result = redis.call("get", KEYS[1])\n\r' +
					'redis.call("del", KEYS[1])\n\r' +
					'return result';
				let register = client.registerScript('test', scriptText);
				return register.then( () => {
					expect(client.registeredScripts.test).to.exist;
					expect(client.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(client.registeredScripts.test.options.numKeyArgs).to.equal(2);
				})
				.then( () => client.runScript('test', 'key', 1) )
				.then( (result) => expect(result).to.equal('1') );
			});
		});

		describe('volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: true
			};
			let client = new RedizClient(config);
			it('should register a script to each shard', () => {
				let shard = client.shard('myKey');
				let scriptText = 'local numKeyArgs = 2\n\r' +
					'redis.call("set", KEYS[1], ARGV[1])\n\r' +
					'redis.call("incr", KEYS[1])\n\r' +
					'local result = redis.call("get", KEYS[1])\n\r' +
					'redis.call("del", KEYS[1])\n\r' +
					'return result';
				let register = client.registerScript('test', scriptText);
				return register.then( () => {
					expect(client.registeredScripts.test).to.exist;
					expect(client.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(client.registeredScripts.test.options.numKeyArgs).to.equal(2);
					expect(shard.registeredScripts.test).to.exist;
					expect(shard.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(shard.registeredScripts.test.options.numKeyArgs).to.equal(2);
				})
				.then( () => client.runScript('test', 'key', 1) )
				.then( (result) => expect(result).to.equal('1') );
			});
		});
	});

	describe('Running lua script from directory', () => {
		describe('volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: true
			};
			let rediz = new RedizClient(config);
			let shard = rediz.shard('myKey');
			it('should have a registeredScript on the shard and the client', () => {
				rediz.registerScriptDir(__dirname + '/resources/lua/').then( () => {
					expect(shard.registeredScripts.test).to.exist;
					expect(shard.registeredScripts.test.options.numKeyArgs).to.equal(2);
					expect(rediz.registeredScripts.test).to.exist;
					expect(rediz.registeredScripts.test.options.numKeyArgs).to.equal(2);
				}).then( () => rediz.runScript('test', 1, 0) )
				.then( (result) => expect(result).to.equal(1) );
			});
		});

		describe('non-volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: false
			};
			let rediz = new RedizClient(config);
			it('should have a registeredScript on the shard and the client', () => {
				return rediz.registerScriptDir(__dirname + '/resources/lua/')
					.then( () => rediz.runScript('test', 1, 0))
					.then( (result) => {
						expect(result).to.equal(1);
					});
			});
		});
	});
});


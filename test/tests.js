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
		});

		describe('volatile Cluster', () => {
			it('should create a redis client and a clusterClient', (done) => {
				let config = {
					host: 'localhost',
					port: '8080',
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
		});

	});

	describe('#shard', () => {

		describe('non-volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '8080',
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

			it('should register a script', (done) => {
				let scriptText = 'local numKeyArgs = 2';
				let register = client.registerScript('test', scriptText);
				expect(register.then).to.exist;
				register.then( () => {
					expect(client.registeredScripts.test).to.exist;
					expect(client.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(client.registeredScripts.test.options.numKeyArgs).to.equal(2);
					done();
				}).catch(done);
			});
		});

		describe('volatile cluster', () => {
			let config = {
				host: 'localhost',
				port: '6379',
				volatileCluster: true
			};
			let client = new RedizClient(config);
			it('should register a script to each shard', (done) => {
				let shard = client.shard('myKey');
				let scriptText = 'local numKeyArgs = 2';
				let register = client.registerScript('test', scriptText);
				expect(register.then).to.exist;
				register.then( () => {
					expect(client.registeredScripts.test).to.exist;
					expect(client.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(client.registeredScripts.test.options.numKeyArgs).to.equal(2);
					expect(shard.registeredScripts.test).to.exist;
					expect(shard.registeredScripts.test.scriptText).to.equal(scriptText);
					expect(shard.registeredScripts.test.options.numKeyArgs).to.equal(2);
					done();
				});
			});
		});
	});
});


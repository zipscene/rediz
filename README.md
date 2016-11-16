# rediz

Multifunction redis client library.  In general, mimics the interface of `node-redis`.

Has the following features:

- Stored functions
- Volatile-redis-cluster sharding
- Conversion from callbacks to promises
- Conversion of all errors to XError's
- master client and shards can use all redis [commands](http://redis.io/commands)

## Basic Usage

### Example of non-volatile cluster.
```js
let RedizClient = require('rediz');
let rediz = new RedizClient({ host: 'localhost', port: 6379, volatileCluster: false });

rediz.registerScriptDir('/path/to/redis/scripts');
rediz.runScript('doSomething', arg1, arg2).then(...);
```

### Example of volatile cluster
```js
let RedizClient = require('rediz');
let rediz = new RedizClient({ host: 'localhost', port: 6379, volatileCluster: true });
let shard = rediz.shard('myKey');

rediz.registerScriptDir('/path/to/redis/scripts');
shard.runScript('doSomething', arg1, arg2).then(...);
```

## Ways to register scripts
All scripts that are registered on the master client, will be availble to any shards created *before* or *after*, the script has been registered.
Registering scripts can be done on either master or any of the shards. If it is done on a shard then the master client will not have access to that script. The two examples above use the registerScriptDir, which will read all the files with the extension `lua`. It will name that script, after the name of the file.

### Example register a script from a single file.
**NOTE** when registering a script from a file, or a directory, the script will be parsed to find the numKeyArgs for redis. So make sure that is defined at the top of the file.
```js
let RedizClient = require('rediz');
let rediz = new RedizClient({ host: 'localhost', port: 6379, volatileCluster: true });

rediz.registerScriptFile('test', 'path/to/redis/script.lua');
rediz.runScript('test', arg1, arg2,).then(...);
```
### Example register a script from text
```js
let scriptText = 'local numKeyArgs = 1\n\r' +
	'redis.call("set", KEYS[1], ARGV[1])\n\r' +
	'redis.call("incr", KEYS[1])\n\r' +
	'local result = redis.call("get", KEYS[1])\n\r' +
	'redis.call("del", KEYS[1])\n\r' +
	'return result';

let RedizClient = require('rediz');
let rediz = new RedizClient({ host: 'localhost', port: 6379, volatileCluster: true });
let shard;

redis.registerScript('foo', scriptText, { numKeyArgs: 1 }); // if numKeyArgs is not defined the text will be parsed the same as the files.
	.then( () => shard =  redis.shard('aKey') )
	.then( () => shard.runScript('foo', '') )
	.then( (result) => return result );
```

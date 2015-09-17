# zs-rediz

Multifunction redis client library.  In general, mimics the interface of `node-redis`.

Has the following features:

- Stored functions
- Volatile-redis-cluster sharding
- Conversion from callbacks to promises
- Conversion of all errors to XError's

Example:

```js
let RedizClient = require('zs-rediz');
let rediz = new RedizClient({ host: 'localhost', port: 6379, volatileCluster: true });
rediz.shard('foo').set('foo', 'test value').then(...);

rediz.registerScriptDir('/path/to/redis/scripts');
rediz.runScript('doSomething', arg1, arg2).then(...);
```



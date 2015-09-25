let expect = require('chai').expect;
let RedisError = require('../lib/redis-error');
let XError = require('xerror');

describe('Class RedisError', () => {

	it('should add a new error code called redis_error', (done) => {
		let errorCode = RedisError.getErrorCode('redis_error');
		expect(errorCode).to.exist;
		done();
	});

	it('should construct a new error', (done) => {
		let message = 'This is an error';
		let error = new RedisError(RedisError.INTERNAL_ERROR, message);
		expect(error).to.exist;
		expect(error.code).to.equal('internal_error');
		expect(error.message).to.equal(message);
		expect(error).to.be.an.instanceof(XError);
		done();
	});

	it('should covert redis client error', (done) => {
		let message = 'Opps, an error occured!';
		let error = RedisError.fromRedisClientError(new Error(message));
		expect(error).to.exist;
		expect(error.code).to.equal('redis_error');
		expect(error.message).to.equal(message);
		expect(error).to.be.an.instanceof(XError);
		done();
	});

});
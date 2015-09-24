local numKeyArgs = 2
if tonumber(ARGV[1]) > 1 then
	redis.call("set", KEYS[2], ARGV[1]);
	redis.call("incrby", KEYS[2], 6);
	local result = redis.call("get", KEYS[2]);
	redis.call("del", KEYS[2]);
	return tonumber(result);
else
	redis.call("set", KEYS[1], ARGV[1]);
	redis.call("incrby", KEYS[1], 10);
	local result = redis.call("get", KEYS[1]);
	redis.call("del", KEYS[1]);
	return tonumber(result);
end
const test = require('node:test');
const assert = require('node:assert/strict');

const { deriveRouteGroupFromPath, runSlidingWindowRateLimit } = require('../lib/trafficMiddleware');

class FakeRedis {
  constructor() {
    this.sortedSets = new Map();
  }

  _getSet(key) {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, []);
    return this.sortedSets.get(key);
  }

  async zremrangebyscore(key, min, max) {
    const set = this._getSet(key).filter((item) => item.score < min || item.score > max);
    this.sortedSets.set(key, set);
  }

  async zadd(key, score, member) {
    const set = this._getSet(key);
    set.push({ score: Number(score), member });
    this.sortedSets.set(key, set);
  }

  async zcard(key) {
    return this._getSet(key).length;
  }

  async pexpire() {}
}

test('deriveRouteGroupFromPath maps major route families', () => {
  assert.equal(deriveRouteGroupFromPath('/'), 'general');
  assert.equal(deriveRouteGroupFromPath('/temple/shirdi-sai'), 'microsite');
  assert.equal(deriveRouteGroupFromPath('/api/temple/register'), 'registration');
  assert.equal(deriveRouteGroupFromPath('/api/booking/create'), 'booking');
  assert.equal(deriveRouteGroupFromPath('/api/bookings'), 'booking');
  assert.equal(deriveRouteGroupFromPath('/dashboard/admin.html'), 'admin');
});

test('runSlidingWindowRateLimit allows within threshold and blocks beyond threshold', async () => {
  const redis = new FakeRedis();
  const key = 'ratelimit:test:general';
  const now = 1_700_000_000_000;

  const first = await runSlidingWindowRateLimit({
    redis,
    key,
    nowMs: now,
    maxRequests: 2,
    windowMs: 60_000,
  });
  const second = await runSlidingWindowRateLimit({
    redis,
    key,
    nowMs: now + 10,
    maxRequests: 2,
    windowMs: 60_000,
  });
  const third = await runSlidingWindowRateLimit({
    redis,
    key,
    nowMs: now + 20,
    maxRequests: 2,
    windowMs: 60_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.count, 3);
});

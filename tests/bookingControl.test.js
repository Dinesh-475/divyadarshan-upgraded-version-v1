const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  buildBookingPausedPayload,
  createBookingControlService,
} = require('../lib/bookingControl');
const { app, bookingControl } = require('../server');

test('buildBookingPausedPayload returns endpoint-safe booking pause response', () => {
  const payload = buildBookingPausedPayload({
    paused: true,
    reason: 'Festival overload',
    resumeAt: '2026-05-07T18:30:00.000Z',
  });

  assert.deepEqual(payload, {
    error: 'BookingPaused',
    reason: 'Festival overload',
    resumeAt: '2026-05-07T18:30:00.000Z',
  });
});

test('booking control service stores and returns paused state', async () => {
  const futureResumeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const service = createBookingControlService({
    redis: null,
    redisSubscriber: null,
    supabase: null,
    bookingPauseSecret: 'secret',
    logger: { warn() {} },
  });

  await service.hydrate();
  const paused = await service.setState(
    {
      paused: true,
      reason: 'System maintenance',
      resumeAt: futureResumeAt,
      adminId: 'ops-admin',
      pausedAt: '2026-05-07T17:30:00.000Z',
    },
    { action: 'paused' }
  );

  assert.equal(paused.paused, true);
  assert.equal(paused.reason, 'System maintenance');

  const loaded = await service.getState();
  assert.equal(loaded.paused, true);
  assert.equal(loaded.adminId, 'ops-admin');
});

test('POST /api/booking/create returns BookingPaused while the global pause flag is active', async () => {
  const futureResumeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await bookingControl.setState(
    {
      paused: true,
      reason: 'Festival overload',
      resumeAt: futureResumeAt,
      adminId: 'test-suite',
      pausedAt: '2026-05-07T17:30:00.000Z',
    },
    { action: 'paused' }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/booking/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'DVS-TEST01',
        temple_key: 'tirupati',
        temple_name: 'Tirupati Balaji',
        qty: 2,
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.error, 'BookingPaused');
    assert.equal(payload.reason, 'Festival overload');
    assert.equal(payload.resumeAt, futureResumeAt);
  } finally {
    await bookingControl.setState(
      {
        paused: false,
        reason: '',
        resumeAt: null,
        adminId: 'test-suite',
        pausedAt: null,
      },
      { action: 'resumed' }
    );
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTicketInventoryPayload, normalizeTicketStatus } = require('../server');

test('normalizeTicketStatus accepts supported statuses and falls back safely', () => {
  assert.equal(normalizeTicketStatus('open'), 'OPEN');
  assert.equal(normalizeTicketStatus('blocked'), 'BLOCKED');
  assert.equal(normalizeTicketStatus('weird-status', 'CLOSED'), 'CLOSED');
});

test('buildTicketInventoryPayload derives safe live inventory defaults', () => {
  const payload = buildTicketInventoryPayload({
    temple_key: 'tirupati',
    temple_slug: 'Tirupati Balaji',
    event_name: 'Shighra Darshan April Batch',
    ticket_type: 'VIP Entry',
    price: 300,
    total_seats: 120,
    booking_limit: 4,
    status: 'open',
    event_date: '2026-05-20',
    event_time: 'Morning (06:00 - 09:00)',
    description: 'Fast-track darshan access'
  });

  assert.equal(payload.temple_slug, 'tirupati-balaji');
  assert.equal(payload.available_seats, 120);
  assert.equal(payload.booked_seats, 0);
  assert.equal(payload.status, 'OPEN');
  assert.equal(payload.booking_enabled, true);
});

test('buildTicketInventoryPayload preserves booked seats and computes sold out state', () => {
  const payload = buildTicketInventoryPayload(
    {
      total_seats: 10,
      available_seats: 0,
      status: 'OPEN'
    },
    {
      temple_key: 'manjunatha',
      event_name: 'Special Evening Darshan',
      ticket_type: 'General Entry',
      price: 0,
      total_seats: 10,
      booked_seats: 10,
      booking_limit: 2,
      status: 'OPEN',
      booking_enabled: true
    }
  );

  assert.equal(payload.booked_seats, 10);
  assert.equal(payload.available_seats, 0);
  assert.equal(payload.status, 'SOLD_OUT');
  assert.equal(payload.booking_enabled, false);
});

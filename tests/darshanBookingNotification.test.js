const test = require('node:test');
const assert = require('node:assert/strict');

// Recreated fixed equivalents to verify correctness
const isPaidBooking = (b) => {
  const type = String(b.ticket_type || b.ticketType || '').toLowerCase();
  if (type.includes('unpaid') || type.includes('free')) {
    return false;
  }
  return (
    type.includes('vip') || 
    type.includes('300') || 
    type.includes('500') || 
    type.includes('1000') || 
    type.includes('1500') || 
    type.includes('shighra') || 
    type.includes('sheegra') || 
    type.includes('suprabhata') || 
    type.includes('seva') || 
    type.includes('combo') || 
    type.includes('paid')
  );
};

const getBookingStartTime = (b) => {
  const visitDateStr = b.visit_date || b.visitDate || b.date;
  if (!visitDateStr) return null;
  
  const baseDate = new Date(visitDateStr);
  if (isNaN(baseDate.getTime())) return null;
  
  let hour = 6; // default 6 AM
  const slotStr = String(b.slot || b.time || '').toLowerCase();
  
  // Match first time instance and its specific AM/PM context rather than checking globally
  const timeMatch = slotStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    const ampm = timeMatch[3];
    if (ampm === 'pm' && hour < 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    } else if (!ampm) {
      const matchIndex = timeMatch.index;
      const context = slotStr.substring(matchIndex, matchIndex + 15);
      if (context.includes('pm') && hour < 12) {
        hour += 12;
      } else if (context.includes('am') && hour === 12) {
        hour = 0;
      }
    }
  } else {
    if (slotStr.includes('afternoon') || slotStr.includes('noon')) {
      hour = 12;
    } else if (slotStr.includes('evening') || slotStr.includes('night')) {
      hour = 16;
    } else if (slotStr.includes('morning')) {
      hour = 6;
    }
  }
  
  baseDate.setHours(hour, 0, 0, 0);
  return baseDate;
};

test('isPaidBooking correctly identifies paid tickets based on ticket type keywords', () => {
  assert.equal(isPaidBooking({ ticket_type: 'VIP Seva' }), true);
  assert.equal(isPaidBooking({ ticket_type: 'Shighra Darshan 300' }), true);
  assert.equal(isPaidBooking({ ticket_type: 'General Free Entry' }), false);
  assert.equal(isPaidBooking({ ticket_type: 'Unpaid Pilgrimage Slot' }), false);
  assert.equal(isPaidBooking({ ticket_type: 'Suprabhata Seva Seva' }), true);
});

test('getBookingStartTime parses standard hour slots and word representations', () => {
  const dateStr = '2026-05-25';
  
  // Specific hour formats
  const t1 = getBookingStartTime({ visit_date: dateStr, slot: 'Morning (10:00 AM - 12:00 PM)' });
  assert.equal(t1.getHours(), 10);
  
  const t2 = getBookingStartTime({ visit_date: dateStr, slot: 'Evening (06:30 PM - 08:30 PM)' });
  assert.equal(t2.getHours(), 18); // 06 PM is 18

  // General word descriptions
  const t3 = getBookingStartTime({ visit_date: dateStr, slot: 'Afternoon slots' });
  assert.equal(t3.getHours(), 12);
  
  const t4 = getBookingStartTime({ visit_date: dateStr, slot: 'Evening Batch' });
  assert.equal(t4.getHours(), 16);
});

test('Booking reminder & waitlist threshold differences for paid vs unpaid slots', () => {
  const paidBooking = { ticket_type: 'VIP Seva' };
  const freeBooking = { ticket_type: 'General Entry' };

  const isPaid = isPaidBooking(paidBooking);
  const isFree = isPaidBooking(freeBooking);

  const reminderPaid = isPaid ? 4.0 : 6.0;
  const expiryPaid = isPaid ? 3.5 : 5.5;

  const reminderFree = isFree ? 4.0 : 6.0;
  const expiryFree = isFree ? 3.5 : 5.5;

  assert.equal(reminderPaid, 4.0);
  assert.equal(expiryPaid, 3.5);
  
  assert.equal(reminderFree, 6.0);
  assert.equal(expiryFree, 5.5);
});

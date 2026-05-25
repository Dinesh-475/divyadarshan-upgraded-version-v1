import type { GeneratedPlan, PlanFormState } from './types';
import { formatINR, uid } from './utils';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function generateMockPlan(form: PlanFormState): GeneratedPlan {
  const pilgrims = clamp(form.pilgrims, 1, 20);
  const nights = clamp(form.nights, 0, 10);

  const baseDistance =
    form.travelMode === 'Flight' ? 520 :
    form.travelMode === 'Train' ? 310 :
    form.travelMode === 'Bus' ? 240 : 210;

  const distanceKm = baseDistance + (form.extraStops.trim() ? 28 : 0) + (form.weatherAware ? 12 : 0);
  const durationHours = distanceKm / (form.travelMode === 'Car' ? 55 : form.travelMode === 'Bus' ? 45 : 60);
  const fuelEstimate = form.travelMode === 'Car' ? Math.round(distanceKm * 7.6) : 0;
  const tollEstimate = form.travelMode === 'Car' ? Math.round(distanceKm * 1.9) : Math.round(distanceKm * 0.6);

  const stayPerNight =
    form.budget === 'Budget' ? 900 :
    form.budget === 'Mid-range' ? 2200 :
    form.budget === 'Premium' ? 4200 : 7500;

  const stay = stayPerNight * (nights || 1);
  const food = (form.foodPreference === 'Jain' ? 450 : 380) * pilgrims * (nights + 1);
  const localTransport = form.travelMode === 'Flight' ? 1800 : 800;
  const hidden = Math.round((stay + food) * (form.festivalAware ? 0.12 : 0.08));
  const fuel = fuelEstimate;
  const tolls = tollEstimate;

  const total = fuel + tolls + stay + food + localTransport + hidden;
  const perPerson = Math.round(total / pilgrims);
  const busSwitchSaving = form.travelMode === 'Train' ? Math.round((fuel + tolls + localTransport + 1200) * 0.35) : Math.round((fuel + tolls + 900) * 0.28);
  const staySaving = Math.round(Math.max(500, stay * 0.32));
  const foodSaving = Math.round(Math.max(350, food * 0.38));

  const surgeAlert =
    form.festivalAware && form.crowdPreference !== 'Least crowded'
      ? 'Festival surge likely: stay prices and queue time may increase.'
      : null;

  const savings = [
    `Use a bus for the last local stretch instead of a full private transfer and save about ${formatINR(busSwitchSaving)}.`,
    `Choose dharmashala/family rooms near the temple instead of premium stays and save about ${formatINR(staySaving)}.`,
    `Use annadana/prasadam for one meal per day and save about ${formatINR(foodSaving)}.`,
  ];

  const summary = [
    `A calm, realistic plan for ${form.temple} with ${pilgrims} pilgrim${pilgrims === 1 ? '' : 's'}.`,
    `Optimized for ${form.timePreference.toLowerCase()} darshan, ${form.crowdPreference.toLowerCase()} preference, and ${form.budget.toLowerCase()} comfort.`,
    `Estimated cost: ${formatINR(total)} total · ${formatINR(perPerson)} per pilgrim.`,
  ].join(' ');

  return {
    id: uid('plan'),
    createdAt: Date.now(),
    templeName: form.temple,
    summary,
    route: {
      distanceKm: Math.round(distanceKm),
      durationText: `${Math.max(2, Math.round(durationHours))}h ${Math.round((durationHours % 1) * 60)}m`,
      fuelEstimate,
      tollEstimate,
      fastest: 'Fastest route via major highways with minimal stops.',
      scenic: 'Scenic spiritual route with quieter stretches and safe pauses.',
      evStops: ['EV charging near main highway junction', 'Backup charger near temple town'],
      restaurants: ['Clean veg restaurant on route', 'Temple-town prasadam counter'],
      safety: form.weatherAware ? 'Moderate' : 'Low risk',
    },
    money: {
      total,
      perPerson,
      fuel,
      stay,
      food,
      tolls,
      localTransport,
      hidden,
      surgeAlert,
      savings,
      savingIdeas: [
        {
          title: form.travelMode === 'Train' ? 'Train + local bus combo' : 'Shared bus/local transfer',
          detail: form.travelMode === 'Train'
            ? 'Take train till the nearest major station, then use a KSRTC/private bus for the temple stretch instead of a private cab.'
            : 'Use a shared bus/local transfer for the last stretch instead of keeping a private vehicle all day.',
          saveAmount: busSwitchSaving,
        },
        {
          title: 'Stay closer, simpler',
          detail: 'Pick a temple trust dharmashala or family room near the temple to reduce both stay cost and local transport.',
          saveAmount: staySaving,
        },
        {
          title: 'Plan meals around prasadam',
          detail: 'Use temple annadana/prasadam for one main meal and keep only one paid restaurant stop.',
          saveAmount: foodSaving,
        },
      ],
    },
    itinerary: [
      { day: 1, time: '05:30', title: 'Depart from start location', detail: 'Leave early for calm roads and smooth parking.', tag: 'travel', durationMins: 20 },
      { day: 1, time: '08:30', title: 'Breakfast stop', detail: form.foodPreference, tag: 'food', durationMins: 40 },
      { day: 1, time: form.timePreference === 'Evening' ? '17:30' : form.timePreference === 'Afternoon' ? '13:30' : '10:30', title: 'Temple arrival & entry', detail: 'Footwear counter, dress-code check, and queue entry.', tag: 'spiritual' },
      { day: 1, time: form.timePreference === 'Evening' ? '18:30' : form.timePreference === 'Afternoon' ? '14:30' : '11:30', title: 'Darshan window', detail: form.vipDarshan ? 'Preferred VIP darshan flow (if available).' : 'Standard darshan flow with buffers.', tag: 'darshan', durationMins: 75 },
      { day: 1, time: '20:00', title: 'Prasadam & calm-down time', detail: 'Light dinner and hydration; keep receipts and essentials ready.', tag: 'food', durationMins: 50 },
      { day: 1, time: '21:00', title: 'Check-in', detail: nights ? 'Settle in early for a fresh morning.' : 'Optional rest stop if needed.', tag: 'stay', durationMins: 35 },
      { day: 2, time: '06:30', title: 'Auspicious start', detail: 'Simple chanting + temple town walk (elderly-friendly pace).', tag: 'spiritual', durationMins: 30 },
      { day: 2, time: '09:30', title: 'Return journey', detail: 'Pack snacks and water; keep a 30–45 min buffer for traffic.', tag: 'travel' },
    ],
    devotee: {
      queueEstimate: form.crowdPreference === 'Least crowded' ? 'Estimated queue: 20–45 minutes' : 'Estimated queue: 60–120 minutes',
      timings: ['Opening: early morning (verify locally)', 'Midday break possible on festival days', 'Evening aarti window (verify locally)'],
      festivalAlerts: form.festivalAware ? ['Festival-aware buffers enabled. Expect higher crowd and stay surge.'] : [],
      auspicious: ['Prefer calm entry windows and keep an extra buffer for rituals.', 'Carry ID and minimal cash for temple counters.'],
      historyCards: [
        { title: 'Temple heritage', body: 'A short, respectful overview of the temple’s cultural significance and local customs.' },
        { title: 'Devotional etiquette', body: 'Dress-code, photography rules, queue behavior, and offerings guidance.' },
      ],
      chants: ['Vishnu Sahasranama (short selection)', 'Suprabhatam (morning)', 'Simple nama-japa recommendation'],
      prasadam: ['Main prasadam counter', 'Annadana / temple meal hall (if available)'],
    },
    stays: [
      {
        category: 'Dharmashala',
        name: 'Temple Trust Dharmashala',
        walkingMins: 8,
        seniorFriendly: true,
        cleanliness: 'Very good',
        earlyCheckin: false,
        rating: 4.4,
        photoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=520&q=80',
        recommendation: 'Best value for devotees who want to stay close and save money.',
        priceHint: 'Low cost',
        bookingUrl: 'https://www.booking.com/searchresults.html?ss=Dharmasthala%20Manjunatha%20Temple',
      },
      {
        category: 'Family rooms',
        name: 'Family Stay Near Temple',
        walkingMins: 12,
        seniorFriendly: true,
        cleanliness: 'Good',
        earlyCheckin: true,
        rating: 4.2,
        photoUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=520&q=80',
        recommendation: 'Good for families needing simple comfort and early check-in.',
        priceHint: 'Mid-range',
        bookingUrl: 'https://www.booking.com/searchresults.html?ss=Dharmasthala%20family%20rooms',
      },
      {
        category: 'Budget',
        name: 'Value Lodge',
        walkingMins: 18,
        seniorFriendly: false,
        cleanliness: 'Good',
        earlyCheckin: false,
        rating: 4.0,
        photoUrl: 'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?auto=format&fit=crop&w=520&q=80',
        recommendation: 'Cheapest option if you are comfortable with a longer walk.',
        priceHint: 'Budget',
        bookingUrl: 'https://www.booking.com/searchresults.html?ss=Budget%20lodge%20near%20Dharmasthala',
      },
      {
        category: 'Premium',
        name: 'Premium Comfort Residency',
        walkingMins: 14,
        seniorFriendly: true,
        cleanliness: 'Excellent',
        earlyCheckin: true,
        rating: 4.6,
        photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=520&q=80',
        recommendation: 'Best comfort pick for seniors or overnight family stays.',
        priceHint: 'Higher comfort',
        bookingUrl: 'https://www.booking.com/searchresults.html?ss=Premium%20hotel%20Dharmasthala',
      },
    ],
  };
}

# Divya Darshan — Platform Context

**Divya Darshan** is a state-of-the-art, high-performance digital sanctuary platform designed to modernize, simplify, and elevate the temple pilgrimage experience in India. It bridges the gap between ancient sacred spaces and modern pilgrims by leveraging real-time AI crowd monitoring, dynamic queuing, interactive parking layout designers, and localized travel itinerary planners.

---

## 🏛️ Platform Architecture & Key Portals

The application is structured into five core specialized modules serving pilgrims, temple administrators, and super administrators:

1. **Pilgrim Dashboard (`dashboard/index.html`)**:
   * The focal point for pilgrims to search registered temples, check live crowd levels, analyze wait times, schedule darshans, purchase VIP/General tickets, book parking spots, and order sacred prasadam.
   * Integrates an AI Travel Planner giving pilgrims personalized itineraries, weather advisories, transport directions, and customized seva reminders.

2. **Login & SignUp Portal (`login/index.html`)**:
   * A premium, 256-bit encrypted spiritual gate managing authentication.
   * Pilgrim accounts automatically sync tickets, transaction receipts, preferences, and custom profile assets across multiple active sessions.

3. **Admin Dashboard (`admin/index.html`)**:
   * The control center for super administrators to monitor global metrics, audit newly submitted temple registration requests, oversee active bookings, track parking slot occupancies, and manage emergency SOS alerts.

4. **Temple Self-Registration Wizard (`register_temple.html`)**:
   * An interactive, step-by-step guided portal for temple administrators to self-register their sacred sanctuaries.
   * Guides them through inputting historical significance, geo-coordinates (Leaflet-backed map integrations), timings, seating setups, booking thresholds, and designing customized parking arena layouts.

5. **Custom Microsite Shell (`microsite_shell.html`)**:
   * A dynamic, highly responsive, lightning-fast Single-Page Application (SPA) shell rendered for each registered temple.
   * Gives individual temples their own beautiful web showcase detailing timings, sevas, interactive maps, booking slots, and counters.

---

## 🛠️ Technology Stack

* **Front-End & Styling**: Raw HTML5, highly responsive Vanilla CSS, and modern utility-first Tailwind CSS with custom glassmorphism, backdrop filters, and smooth micro-animations.
* **Client Logic**: Vanilla ES6+ JavaScript, utilizing localized storage state synchronizations, Leaflet mapping APIs, and MapLibre GL overlays.
* **Back-End Server**: Node.js utilizing Express, managing offline fallbacks, Supabase endpoints, and local JSON database backups (`data/`).
* **Database & Memory**: Supabase SQL backend integrated with Redis caching layers to process high-traffic queue backlogs securely.

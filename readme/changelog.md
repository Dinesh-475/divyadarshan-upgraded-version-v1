# Changelog — Divya Darshan Platform Changes

This document tracks all features, technical improvements, bug fixes, and visual enhancements implemented in the **Divya Darshan** platform, updated at every major step.

---

## 🚀 Recent Implementations & Milestone Upgrades

### 1. High Visibility Language Switcher & Branded Logo Avatars with Custom Uploads
* **High Contrast Language Selector (`shared/i18n.js`)**: Upgraded the centralized translation selector button and spans to static premium white (`text-white border-white/20 hover:bg-white/10`), ensuring universal visibility and maximum visual pop across all portals regardless of the background theme/color gradient.
* **Branded Logo Default & Custom Image Upload (`dashboard/index.html`)**: Simplified the pilgrim profile modal header and top navigation bar avatar to present the clean, elegant platform brand logo (`../assets/news/logo.png`) inside a white rounded container as the default profile picture (retiring any complex default initial letters, dynamic hashed emojis, or grid slicing). Enabled custom picture uploads so pilgrims can click the avatar inside their dashboard profile card to choose and save their own picture, displaying it instantly on upload.

### 2. Personal Profile Upgrades & Dynamic Avatars
* **Dynamic Hashed Emojis**: Added a dynamic name-based hashing function (`getUserEmoji`) to select unique spiritual and serene emojis (🧘, 🕉️, 🛕, 🙏, 🌸, ☀️, 🕯️, 🔔, 🕊️, 🌅, 🦁, 🦉, 🦋, 🐘, 🌺) for every user, rendering a beautifully styled circle gradient badge as their default avatar.
* **Direct Image Uploads**: Integrated a hidden camera overlay on the pilgrim profile card. Pilgrims can upload Jpeg/Png images, which are instantly Base64-encoded, previewed, and persisted in local users' databases via PUT `/api/user/profile` API.
* **Topbar Auth Locales**: Resolved a sync issue where Sign-Out text reverted to "Sign In" during localized language switches. Integrated a dynamic `"top-signout"` key translated across all 9 supported Indic languages.

### 3. Multi-Page Premium Localization & Auto-Adjusting Layouts (i18n)
* **Centralized i18n Translation Engine (`shared/i18n.js`)**: Created a unified i18n core serving 9 major Indian languages: English (`en`), Hindi (`hi`), Kannada (`kn`), Tamil (`ta`), Telugu (`te`), Malayalam (`ml`), Marathi (`mr`), Bengali (`bn`), and Gujarati (`gu`).
* **Visual Selector Dropdown Picker**: Embedded unified dropdown select dropdown widgets next to notification headers and menu blocks on all 5 portals.
* **Indic Conjunct Character Joinings**: Added typographical resets to automatically strip uppercase rules and letter-spacings when regional Indic languages are active, preventing wraps, clipping, or grid breaks.
* **Dynamic Tab Translations**: Linked the microsite dynamic tab router to the i18n engine, enabling instant menu translations in regional scripts.
* **i18n Verification Suite**: Integrated an automated unit test `tests/i18n.test.js` validating dictionary completeness, key alignments, and localStorage sync behavior under mock DOM environments.

### 4. Advanced Booking Notifications & Interactive Parking Canvas
* **Interactive Admin Parking CAD Designer**: Created an absolute blueprint editor inside `admin/index.html` supporting concentric circle layouts, angled slots, standard grids, custom walkways, and bike/EV spots.
* **Visual Pilgrim Parking Blueprint**: Updated the pilgrim dashboard view to parse and render admin CAD slots dynamically via percentage coordinate scaling.
* **High-Tech Uiverse Translucent Loading Screens**: Integrated premium, translucent glassmorphic loading animations (`bg-white/30 backdrop-blur-xl`) with the Nawsome blue-theme loader spinner across all checkout, signing, and checkout flows.
* **Automated Grace Reminders & Timing Worker**: Configured a Nodemailer email daemon auditing databases every 60 seconds. Sends reminders exactly 4/6 hours prior to darshans and releases seats to waiting list queues after a 30-minute grace period.

### 5. Critical Logical Bug Fixes
* **Unpaid Keyword Substring Matcher**: Resolved a bug where unpaid or free tickets (containing `'unpaid'`) were incorrectly matched by `type.includes('paid')`, assigning them wrong timer windows. Added absolute safeguards.
* **AM/PM Range Slot Parser**: Fixed an AM/PM range parsing bug that added 12 hours to morning timings like `10:00 AM - 12:00 PM` due to substring matching. Integrated targeted regex checking.

### 6. Performance & Backlog Optimizations
* **Queue Popping Speedups**: Upgraded the queue middleware worker to clear up to **50 items per tick** instead of a single popped item per second, accelerating throughput.
* **Fast Status Polling**: Accelerated client queue-status polling loops from `2000ms` down to **`400ms`** for snappy transits.
* **Minimized Visual Handshake Delays**: Reduced the dashboard system loader delay from `1000ms` to **`100ms`** and cut the auth redirect delay down to **`300ms`**, making dashboard refreshes exceptionally quick.

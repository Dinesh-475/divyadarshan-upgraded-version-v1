# Global Architecture Rule: Universal "Divya Darshan" Platform

## 1. Core Philosophy (Universal Abstraction)
This is a multi-religion spiritual platform. NO feature should be hardcoded to one faith. 
- "Darshan" becomes `SpiritualVisit`.
- "Temple" becomes `PlaceOfWorship`.
- "Prasad" becomes `SacredOffering`.
The UI must dynamically render the correct terminology, imagery, and color palettes based on the user's `selected_religion` (Hinduism, Islam, Christianity, Buddhism, Sikhism, Jainism, etc.).

## 2. Authentication Strictness (Gated Experience)
- The root page (`/`) is an animated, high-end login/signup portal ONLY. No exploration is allowed without an account.
- Upon signup, users MUST select their primary religion. This is saved to their profile.
- Logging out must completely clear local state and redirect to `/`.

## 3. UI/UX & Animations
- Use `framer-motion` for all page transitions, modal popups, and micro-interactions. The site must feel premium and serene.
- Use the Unsplash API (or deterministic generic image URLs) to fetch high-quality images based on the active religion (e.g., query "Mosque architecture" or "Jain temple").

## 4. Shared vs. Specific Features
- **Shared:** AI Route Planner, User Profile, Global Settings.
- **Specific:** Prayer times, specific rituals, calendar events.

// ===== Divya Darshan Common Dashboard Module =====
            <span class="material-symbols-outlined">confirmation_number</span>
            <span data-i18n="bnav-bookings">Bookings</span>
        </button>
        <button class="dd-bnav-btn" onclick="showView('view-parking')">
            <span class="material-symbols-outlined">local_parking</span>
            <span data-i18n="bnav-parking">Parking</span>
        </button>
        <button class="dd-bnav-btn text-red-600" onclick="showView('view-emergency')">
            <span class="material-symbols-outlined text-red-600" style="font-variation-settings: 'FILL' 1;">emergency_home</span>
            <span class="font-extrabold text-red-600" data-i18n="bnav-sos">SOS</span>
        </button>
    </nav>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // ===== I18N SYSTEM =====
        // Loaded from shared/i18n.js

        // ── HERO CAROUSEL LOGIC ──
        let ddHeroIndex = 0;
        const ddHeroSlides = 7;
        let ddHeroInterval = null;

        function ddHeroGo(idx) {
            ddHeroIndex = idx;
            const slides = document.querySelectorAll('.hero-slide');
            const dots = document.querySelectorAll('.hero-dot');
            const counter = document.getElementById('dd-hero-counter');

            slides.forEach((slide, i) => {
                if (i === idx) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            dots.forEach((dot, i) => {
                if (i === idx) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });

            if (counter) {
                counter.innerText = `0${idx + 1} / 0${ddHeroSlides}`;
            }

            // Reset timer so it doesn't transition immediately after click
            resetDdHeroTimer();
        }

        function ddHeroNext() {
            ddHeroIndex = (ddHeroIndex + 1) % ddHeroSlides;
            ddHeroGo(ddHeroIndex);
        }

        function resetDdHeroTimer() {
            if (ddHeroInterval) clearInterval(ddHeroInterval);
            // Carousel loop deactivated for static premium hero image
            // ddHeroInterval = setInterval(ddHeroNext, 5000);
        }

        // ── SCROLL REVEAL OBSERVER ──
        function initializeScrollReveals() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('dd-in');
                        // Unobserve once animation is triggered
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.05,
                rootMargin: '0px 0px -45px 0px'
            });

            document.querySelectorAll('.dd-reveal, .dd-reveal-l, .dd-reveal-r').forEach(el => {
                observer.observe(el);
            });
        }

        // ── LAZY IMAGE FADE-IN OBSERVER ──
        function initializeLazyImageObserver() {
            const handleImageLoad = (img) => {
                img.classList.add('dd-loaded');
            };
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                if (img.complete) {
                    handleImageLoad(img);
                } else {
                    img.addEventListener('load', () => handleImageLoad(img));
                }
            });
        }

        // ── DYNAMIC IMAGE FALLBACK CONFIGS ──
        const DEFAULT_TEMPLE_IMAGES = {
            'iskcon-temple-bengaluru': '../assets/news/iskcon_hero.png',
            'kashi-vishwanath-full-demo': '../assets/news/Kashi-Vishwanath-Temple.webp',
            'virupaksha-hampi': '../assets/news/virupaksha_hero.png',
            'virupaksha-temple-hampi': '../assets/news/virupaksha_hero.png'
        };

        function getDefaultTempleImage(slug) {
            return DEFAULT_TEMPLE_IMAGES[slug] || DEFAULT_TEMPLE_IMAGE;
        }

        // TEMPLE MODAL LOGIC
        function openTempleDetails(el) {
            const modal = document.getElementById('temple-detail-modal');
            const content = document.getElementById('temple-modal-content');

            // Extract info from clicked card
            const imgElement = el.querySelector('img');
            const titleEl = el.querySelector('p.font-bold') || el.querySelector('h3.font-bold') || el.querySelector('h3.font-manrope');
            let title = titleEl ? titleEl.innerText : 'Sacred Temple';

            // Determine location robustly
            let loc = 'Sacred Location';
            const pElements = el.querySelectorAll('p');
            if (pElements.length > 1 && !pElements[1].classList.contains('text-on-surface') && !pElements[1].classList.contains('font-bold')) {
                loc = pElements[1].innerText;
            }

            // Fallback normalization for title and location if coming from Live Status card
            if (title.includes('Venkateswara') || title === 'Tirupati') { loc = 'Tirupati, AP'; title = 'Tirupati'; }
            else if (title.includes('Krishna')) { loc = 'Udupi, KA'; title = 'Udupi Krishna'; }
            else if (title.includes('Manjunatha') || title === 'Dharmasthala') { loc = 'Dharmasthala, KA'; title = 'Dharmasthala'; }
            else if (title.includes('Meenakshi')) { loc = 'Madurai, TN'; title = 'Meenakshi Amman Temple'; }
            else if (title.includes('Vishwanath')) { loc = 'Varanasi, UP'; title = 'Kashi Vishwanath'; }
            else if (title.includes('Golden Temple')) { loc = 'Vellore, TN'; title = 'Golden Temple'; }
            else if (title.includes('Subramanya')) { loc = 'Kukke, KA'; title = 'Kukke Subramanya'; }
            else if (title.includes('Kedarnath')) { loc = 'Uttarakhand'; title = 'Kedarnath'; }
            let desc = imgElement.getAttribute('data-alt') || "Experience the timeless serenity of this sacred destination. A deeply spiritual journey awaits.";
            desc = desc.charAt(0).toUpperCase() + desc.slice(1) + ".";

            // Set modal content
            document.getElementById('temple-modal-img').src = imgElement.src;
            document.getElementById('temple-modal-title').innerText = title;
            document.getElementById('temple-modal-loc').innerHTML = `<span class="material-symbols-outlined text-[18px] mr-1">location_on</span> ${loc}`;
            document.getElementById('temple-modal-desc').innerText = desc;

            const mapUrls = {
                'Tirupati': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3876.108428236746!2d79.34960521528646!3d13.683272490391484!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4d4b0f8cd4ddbf%3A0xe6bf446d1bf2da14!2sSri%20Venkateswara%20Swamy%20Vaari%20Temple!5e0!3m2!1sen!2sin!4v1689255050800!5m2!1sen!2sin',
                'Dharmasthala': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.373111452144!2d75.37877231535492!3d12.955577290866632!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba4c81a17951a89%3A0x6cb11cd48b48b598!2sShri%20Kshetra%20Dharmasthala%20Manjunatha%20Swamy%20Temple!5e0!3m2!1sen!2sin!4v1689255150800!5m2!1sen!2sin',
                'Kashi Vishwanath': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14431.11195655325!2d83.00693991535423!3d25.310860590866632!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398e2e21ee9ebd53%3A0x33b8fb347eaee714!2sShri%20Kashi%20Vishwanath%20Temple!5e0!3m2!1sen!2sin!4v1689255250800!5m2!1sen!2sin',
                'Udupi Krishna': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15525.688225571617!2d74.7439053153542!3d13.340919990866632!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbc189ac3e8bb5d%3A0x8ffabf537042a353!2sUdupi%20Sri%20Krishna%20Matha!5e0!3m2!1sen!2sin!4v1689255350800!5m2!1sen!2sin',
                'Golden Temple': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15581.042220478144!2d79.0880191153542!3d12.871891990866632!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bad38e07973ebf1%3A0xc3fbfdc13edceaa7!2sSripuram%20Sri%20Mahalakshmi%20Golden%20Temple!5e0!3m2!1sen!2sin!4v1689255450800!5m2!1sen!2sin',
                'Meenakshi Amman Temple': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15764.209307771617!2d78.1182283153542!3d9.919502990866632!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b00c582f309a1ff%3A0x6bba2a7fbf6ed72!2sMeenakshi%20Amman%20Temple!5e0!3m2!1sen!2sin!4v1689255550800!5m2!1sen!2sin'
            };
            const defaultMap = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d14008.069438994334!2d77.216721!3d28.613939!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1689255650800!5m2!1sen!2sin';
            document.getElementById('temple-modal-map').src = mapUrls[title] || defaultMap;

            // Show modal with animation
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // small delay for css transition to trigger
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            }, 10);

            const section = document.getElementById('extra-temples');
            const btn = document.getElementById('view-all-btn');
            extrasVisible = !extrasVisible;
            if (extrasVisible) {
                section.classList.remove('hidden');
                // Small delay to allow display:block to apply before changing opacity
                setTimeout(() => section.classList.remove('opacity-0'), 10);
                btn.innerHTML = `Hide All <span class="material-symbols-outlined text-sm group-hover:-translate-y-1 transition-transform">keyboard_arrow_up</span>`;
            } else {
                section.classList.add('opacity-0');
                setTimeout(() => section.classList.add('hidden'), 500); // Wait for transition
                btn.innerHTML = `View All <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>`;
            }
        }

        // ==================== AI CHAT ENGINE ====================
        let chatOpen = false;

        // Interactive Audio Feedback (Browser Synth Web Audio API)
        function playToggleSound() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playTone = (freq, startTime, duration, vol) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(vol, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };
                const now = audioCtx.currentTime;
                if (chatOpen) {
                    // Open sound: cheerful rising C5 -> E5 tone
                    playTone(523.25, now, 0.15, 0.04);
                    playTone(659.25, now + 0.08, 0.25, 0.04);
                } else {
                    // Close sound: soft descending E5 -> C5 tone
                    playTone(659.25, now, 0.15, 0.03);
                    playTone(523.25, now + 0.08, 0.2, 0.03);
                }
            } catch (e) {
                console.log('Audio feedback blocked by browser policies or unsupported:', e);
            }
        }

        function playSoftChime() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playTone = (freq, startTime, duration, vol) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(vol, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };
                const now = audioCtx.currentTime;
                // High premium double-ding chime (E6 -> A6) for incoming bot response
                playTone(1318.51, now, 0.25, 0.03);
                playTone(1760.00, now + 0.08, 0.45, 0.03);
            } catch (e) {}
        }

        function toggleChat() {
            const panel = document.getElementById('ai-chat-panel');
            chatOpen = !chatOpen;
            if (chatOpen) {
                panel.classList.remove('translate-y-[120%]', 'opacity-0');
                panel.classList.add('translate-y-0', 'opacity-100');
            } else {
                panel.classList.add('translate-y-[120%]', 'opacity-0');
                panel.classList.remove('translate-y-0', 'opacity-100');
            }
            playToggleSound();
        }

        // (Gemini-in-browser config removed; assistant is server-backed)

        function handleChatEnter(e) {
            if (e.key === 'Enter') sendChatMessage();
        }

        function quickChip(text) {
            document.getElementById('chat-input').value = text;
            sendChatMessage();
        }

        // ---- Fallback Knowledge Base ----
        const _chatKB = [
            {
                keys: ['crowd', 'rush', 'busy', 'people', 'waiting', 'wait time', 'queue', 'line'],
                reply: () => {
                    return `🏛️ **Live Crowd Status:**\n\n• **Tirupati (Venkateswara):** Medium crowd — ~45 min wait\n• **Dharmasthala (Manjunatha):** High crowd — ~2 hr wait\n• **Sri Krishna (Udupi):** Low crowd — ~10 min wait\n\nTip: Best time to visit is **early morning (5–7 AM)** for minimal queues.`;
                }
            },
            {
                keys: ['best time', 'when to visit', 'good time', 'avoid rush', 'off peak', 'less crowd', 'empty'],
                reply: () => `⏰ **Best Times to Visit:**\n\n• **Tirupati:** Tuesday & Wednesday early mornings (5–7 AM) see the least crowd\n• **Dharmasthala:** Weekday afternoons (2–4 PM) are relatively calm\n• **Kedarnath:** September–October for clearer weather\n\nAvoid **weekends and festivals** — crowd spikes by 3×.`
            },
            {
                keys: ['ticket', 'book', 'booking', 'darshan ticket', 'e-ticket', 'slot', 'reserve', 'availability'],
                reply: () => `🎟️ **Booking a Darshan Ticket:**\n\n1. Go to **Tickets** in the sidebar\n2. Select your temple and date\n3. Choose a time slot\n4. Enter pilgrim count & pay\n5. Download your e-ticket with QR code\n\nFree slots are available for most temples. Tirupati special darshan tickets cost ₹300/person.`
            },
            {
                keys: ['parking', 'park', 'vehicle', 'car', 'bike', 'two wheeler', 'bus', 'auto'],
                reply: () => {
                    return `🅿️ **Live Parking Status:**\n\n• **Tirupati — Rambagha Lot:** 120 car slots free\n• **Dharmasthala — Bahubali Lot:** 45 car slots free\n\nBike parking is free at both temples. Buses have a dedicated bay near the main entrance.\n→ Go to **Parking** tab for live vehicle map.`;
                }
            },
            {
                keys: ['gate', 'entry', 'entrance', 'exit', 'which gate', 'door', 'path'],
                reply: () => `🚪 **Entry & Exit Gates:**\n\n• **Tirupati:** Use **Vaikuntham Queue Complex Gate 1** for standard darshan. Gate 3 for senior citizens.\n• **Dharmasthala:** **River Gate** (North) recommended — 20% shorter queue on weekdays\n• **Kedarnath:** Single main entry from Gaurikund trail.`
            },
            {
                keys: ['timing', 'time', 'open', 'close', 'hours', 'darshan time', 'schedule', 'when open'],
                reply: () => `🕐 **Temple Timings:**\n\n| Temple | Opens | Closes |\n|---|---|---|\n| Tirupati | 2:30 AM | 11:00 PM |\n| Dharmasthala | 6:00 AM | 8:00 PM |\n| Udupi Krishna | 5:30 AM | 8:30 PM |\n\nSpecial abhishekams start 1 hour before regular opening.`
            },
            {
                keys: ['dress', 'dress code', 'attire', 'clothes', 'wear', 'saree', 'dhoti', 'western'],
                reply: () => `👗 **Dress Code:**\n\n• **Men:** Dhoti or traditional pants + shirt. No shorts or lungis.\n• **Women:** Saree, salwar kameez, or churidar.\n• **Dharmasthala:** Traditional attire is **strictly mandatory** for darshan.`
            },
            {
                keys: ['prasad', 'prasadam', 'food', 'laddu', 'annadana', 'free food', 'meal'],
                reply: () => `🍛 **Prasadam & Food:**\n\n• **Tirupati:** Famous **₹50 laddus** — buy at the official counter. Free meals served 12–3 PM.\n• **Dharmasthala:** **Free Annadana** served to all pilgrims every day!\n• **Udupi:** Temple offers free breakfast prasadam after morning puja.`
            },
            {
                keys: ['safety', 'solo', 'security', 'safe', 'camera', 'phone', 'mobile', 'lock', 'locker'],
                reply: () => `🛡️ **Safety & Storage:**\n\n• **Lockers:** Available near the main entrance for mobiles/cameras (₹10–20 fee).\n• **Phones:** Strictly prohibited inside the sanctum. Please deposit them at the counter.\n• **Solo Travelers:** Temples are very safe with 24/7 security patrol. Keep emergency contacts handy.`
            },
            {
                keys: ['senior', 'old', 'elderly', 'wheelchair', 'disabled', 'special need', 'handicap'],
                reply: () => `👨‍🦳 **Senior & Special Facilities:**\n\n• **Priority Queue:** Available for pilgrims above 65 years and specially-abled individuals.\n• **Wheelchairs:** Provided free of charge at the entry point of most major temples.\n• **Rest Areas:** Dedicated seating available along the queue complexes.`
            },
            {
                keys: ['festival', 'event', 'puja', 'seva', 'offering', 'ritual', 'abhishekam'],
                reply: () => `✨ **Festivals & Rituals:**\n\n• **Tirupati:** Brahmotsavam (Sept/Oct) is the biggest event. Book 3 months in advance!\n• **Dharmasthala:** Laksha Deepotsava (Nov/Dec) features 100,000+ lamps.\n• **Sevas:** Arjitha Seva and Kalyanotsavam can be booked on the official websites.`
            },
            {
                keys: ['thank', 'thanks', 'great', 'awesome', 'nice', 'good', 'helpful', 'perfect', 'ok', 'okay'],
                reply: () => `🙏 Glad I could help! May your pilgrimage be blessed and peaceful. Is there anything else you'd like to know?`
            },
            {
                keys: ['hello', 'hi', 'hey', 'namaste', 'good morning', 'greet'],
                reply: () => `🙏 Namaste! Welcome to **Divya Darshan**. How can I assist you today? You can ask about:
\n• **Crowd levels** & waiting times
• **Ticket booking** steps
• **Parking availability**
• **Dress code** & timings`},
            {
                keys: ['plan', 'itinerary', 'schedule', 'trip', 'day plan', 'visit plan'],
                reply: () => `📋 **Planning your visit?** Use the **Travel Planner** button on the dashboard! It creates a full hour-by-hour itinerary for Tirupati or Dharmasthala based on your arrival time and group size. Just click "Plan My Visit" in the Live Status section.`
            },
        ];

        function _fallbackReply(message) {
            const msg = message.toLowerCase();
            for (const rule of _chatKB) {
                if (rule.keys.some(k => msg.includes(k))) {
                    return rule.reply();
                }
            }
            // Generic fallback
            return `🙏 I understand you're asking about "${message.slice(0, 40)}...". Here are some things I can help with:\n\n• **Crowd status** — real-time temple queue levels\n• **Ticket booking** — step-by-step guide\n• **Parking** — live slot availability\n• **Temple timings** — opening & closing hours\n• **Best time to visit** — avoid rush hours\n\nTry rephrasing your question or tap one of the quick buttons!`;
        }

        async function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (!message) return;

            // ===== Chat-driven ticket booking (real booking via /api/bookings) =====
            window._ddBookingChat = window._ddBookingChat || { active: false, step: 'idle', data: {} };

            const normalized = message.toLowerCase().trim();
            const wantsBooking =
                normalized.includes('book ticket') ||
                normalized.includes('book a ticket') ||
                normalized.includes('book darshan') ||
                normalized.includes('book pass') ||
                normalized === 'book' ||
                normalized === 'booking';

            const isCancel = ['cancel', 'stop', 'exit', 'quit'].includes(normalized);

            async function _ddBookingChatAsk(text) {
                appendMessage(text, 'bot');
                window._ddChatHistory = window._ddChatHistory || [];
                window._ddChatHistory.push({ role: 'assistant', content: String(text || '') });
                if (window._ddChatHistory.length > 30) window._ddChatHistory = window._ddChatHistory.slice(-30);
            }

            function _pickTempleKeyFromText(t) {
                const s = String(t || '').toLowerCase();
                if (s.includes('tirupati') || s.includes('balaji') || s.includes('venkates')) return 'tirupati';
                if (s.includes('dharmasthala') || s.includes('manjunatha')) return 'manjunatha';
                if (s.includes('udupi') || s.includes('krishna')) return 'krishna';
                if (s.includes('kukke') || s.includes('subramanya')) return 'kukke';
                return '';
            }

            function _parseSlot(t) {
                const s = String(t || '').toLowerCase();
                if (s.includes('morning')) return 'Morning (06:00 - 12:00)';
                if (s.includes('afternoon') || s.includes('noon')) return 'Afternoon (12:00 - 16:00)';
                if (s.includes('evening') || s.includes('night')) return 'Evening (16:00 - 20:00)';
                return '';
            }

            function _parseQty(t) {
                const m = String(t || '').match(/\b(\d{1,2})\b/);
                const n = m ? Number(m[1]) : NaN;
                if (!Number.isFinite(n) || n < 1) return null;
                return n;
            }

            function _parsePhone(t) {
                const digits = String(t || '').replace(/\D/g, '');
                if (digits.length < 8) return null;
                return digits.slice(-10); // keep last 10 digits if longer
            }

            function _parseDate(t) {
                // Accept YYYY-MM-DD (preferred). Otherwise return null.
                const m = String(t || '').match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
                if (!m) return null;
                return `${m[1]}-${m[2]}-${m[3]}`;
            }

            function _parseTicketType(t) {
                const s = String(t || '').toLowerCase();
                if (s.includes('vip') || s.includes('300') || s.includes('shighra') || s.includes('sheegra')) return 'Shighra Darshan (VIP Entry - ₹300)';
                if (s.includes('suprabhata') || s.includes('500')) return 'Suprabhata Darshan (Early Morning - ₹500)';
                if (s.includes('combo') || s.includes('1500') || s.includes('prasadam')) return 'Darshan + Prasadam Sweekar (Family Combo - ₹1500)';
                if (s.includes('donation') || s.includes('seva') || s.includes('1000')) return 'Devotee Seva (Donation + Darshan - ₹1000)';
                if (s.includes('free') || s.includes('general') || s.includes('0')) return 'General Darshan (Free Entry)';
                return '';
            }

            async function _resolveChatTicketChoice(templeKey, preferredType) {
                let tickets = macroTicketInventoryState.ticketsByTemple[templeKey] || [];
                if (!tickets.length) {
                    await loadPublicTicketsForTemple(templeKey);
                    tickets = macroTicketInventoryState.ticketsByTemple[templeKey] || [];
                }
                const openTickets = tickets.filter(ticket =>
                    String(ticket.status || '').toUpperCase() === 'OPEN' &&
                    ticket.booking_enabled !== false &&
                    Number(ticket.available_seats || 0) > 0
                );
                if (!openTickets.length) return null;
                if (!preferredType) return openTickets[0];
                return openTickets.find(ticket => String(ticket.ticket_type || '').toLowerCase() === preferredType.toLowerCase())
                    || openTickets.find(ticket => String(ticket.ticket_type || '').toLowerCase().includes(preferredType.toLowerCase()))
                    || null;
            }

            // Start flow
            if (!window._ddBookingChat.active && wantsBooking) {
                window._ddBookingChat.active = true;
                window._ddBookingChat.step = 'temple';
                window._ddBookingChat.data = {};
                appendMessage(message, 'user');
                window._ddChatHistory = window._ddChatHistory || [];
                window._ddChatHistory.push({ role: 'user', content: String(message || '') });
                if (window._ddChatHistory.length > 30) window._ddChatHistory = window._ddChatHistory.slice(-30);
                input.value = '';
                await _ddBookingChatAsk(
                    `🎟️ Sure — I can book your ticket now.\n\n1) Which temple? (Tirupati / Dharmasthala / Udupi / Kukke)\n\nType **cancel** anytime to stop.`
                );
                return;
            }

            // Continue flow
            if (window._ddBookingChat.active) {
                appendMessage(message, 'user');
                window._ddChatHistory = window._ddChatHistory || [];
                window._ddChatHistory.push({ role: 'user', content: String(message || '') });
                if (window._ddChatHistory.length > 30) window._ddChatHistory = window._ddChatHistory.slice(-30);
                input.value = '';

                if (isCancel) {
                    window._ddBookingChat = { active: false, step: 'idle', data: {} };
                    await _ddBookingChatAsk('✅ Booking cancelled. If you want, type “book ticket” again.');
                    return;
                }

                const step = window._ddBookingChat.step;
                const d = window._ddBookingChat.data || {};

                if (step === 'temple') {
                    const templeKey = _pickTempleKeyFromText(message) || (window._bookingState?.templeKey || '');
                    if (!templeKey) {
                        await _ddBookingChatAsk('Please pick one: **Tirupati**, **Dharmasthala**, **Udupi**, or **Kukke**.');
                        return;
                    }
                    d.temple_key = templeKey;
                    d.temple_name = (templeNames && templeNames[templeKey]) ? templeNames[templeKey] : templeKey;
                    window._ddBookingChat.step = 'date';
                    window._ddBookingChat.data = d;
                    await _ddBookingChatAsk('2) Enter **visit date** in `YYYY-MM-DD` (example `2026-04-10`).');
                    return;
                }

                if (step === 'date') {
                    const date = _parseDate(message);
                    if (!date) {
                        await _ddBookingChatAsk('Please send date in `YYYY-MM-DD` format. Example: `2026-04-10`.');
                        return;
                    }
                    d.visit_date = date;
                    window._ddBookingChat.step = 'slot';
                    window._ddBookingChat.data = d;
                    await _ddBookingChatAsk('3) Which slot? **morning / afternoon / evening**');
                    return;
                }

                if (step === 'slot') {
                    const slot = _parseSlot(message);
                    if (!slot) {
                        await _ddBookingChatAsk('Please type: **morning** or **afternoon** or **evening**.');
                        return;
                    }
                    d.slot = slot;
                    window._ddBookingChat.step = 'qty';
                    window._ddBookingChat.data = d;
                    await _ddBookingChatAsk('4) How many pilgrims? (example `2`)');
                    return;
                }

                if (step === 'qty') {
                    const qty = _parseQty(message);
                    if (!qty) {
                        await _ddBookingChatAsk('Please enter a number of pilgrims (example `2`).');
                        return;
                    }
                    d.qty = qty;
                    window._ddBookingChat.step = 'phone';
                    window._ddBookingChat.data = d;
                    await _ddBookingChatAsk('5) Phone number (for the ticket).');
                    return;
                }

                if (step === 'phone') {
                    const phone = _parsePhone(message);
                    if (!phone) {
                        await _ddBookingChatAsk('Please enter a valid phone number (at least 8 digits).');
                        return;
                    }
                    d.phone = phone;
                    window._ddBookingChat.step = 'type';
                    window._ddBookingChat.data = d;
                    await _ddBookingChatAsk('6) Ticket type: **free** or **vip 300** (or `suprabhata 500`, `combo 1500`).');
                    return;
                }

                if (step === 'type') {
                    const preferredType = _parseTicketType(message);
                    const liveTicket = await _resolveChatTicketChoice(d.temple_key, preferredType);
                    if (!liveTicket) {
                        window._ddBookingChat = { active: false, step: 'idle', data: {} };
                        await _ddBookingChatAsk('❌ No open live tickets are available for that temple right now. Please try another temple or book from the main ticket section later.');
                        return;
                    }
                    if (d.qty > Number(liveTicket.available_seats || 0)) {
                        await _ddBookingChatAsk(`Only ${liveTicket.available_seats} seats are left for **${liveTicket.event_name}**. Please enter a smaller group size or restart the booking.`);
                        window._ddBookingChat.step = 'qty';
                        window._ddBookingChat.data = d;
                        return;
                    }
                    if (d.qty > Number(liveTicket.booking_limit || 1)) {
                        await _ddBookingChatAsk(`This ticket allows up to ${liveTicket.booking_limit} seats per booking. Please send a smaller quantity.`);
                        window._ddBookingChat.step = 'qty';
                        window._ddBookingChat.data = d;
                        return;
                    }
                    d.ticket_type = liveTicket.ticket_type;
                    d.ticket_inventory_id = liveTicket.id;
                    d.event_name = liveTicket.event_name;
                    d.temple_slug = liveTicket.temple_slug || null;
                    d.visit_date = liveTicket.event_date || d.visit_date;
                    d.slot = liveTicket.event_time || d.slot;

                    // Create booking now (real DB)
                    const ticketId = (typeof generateTicketId === 'function') ? generateTicketId() : ('DVS-' + Math.floor(Math.random() * 90000 + 10000));
                    const payload = {
                        id: ticketId,
                        temple_key: d.temple_key,
                        temple_name: d.temple_name,
                        visit_date: d.visit_date,
                        slot: d.slot,
                        qty: d.qty,
                        phone: d.phone,
                        ticket_type: d.ticket_type,
                        ticket_inventory_id: d.ticket_inventory_id,
                        temple_slug: d.temple_slug,
                        event_name: d.event_name,
                        source: 'Online',
                        status: 'Pending'
                    };

                    try {
                        await ddCreateBooking(payload);
                    } catch (e) {
                        window._ddBookingChat = { active: false, step: 'idle', data: {} };
                        await _ddBookingChatAsk('❌ Booking failed to save. Please try again in 1 minute (server/database issue).');
                        return;
                    }

                    window._ddBookingChat = { active: false, step: 'idle', data: {} };
                    await _ddBookingChatAsk(
                        `✅ Ticket booked!\n\n` +
                        `**Event:** ${d.event_name}\n` +
                        `**Temple:** ${payload.temple_name}\n` +
                        `**Ticket ID:** ${payload.id}\n` +
                        `**Date:** ${payload.visit_date}\n` +
                        `**Slot:** ${payload.slot}\n` +
                        `**People:** ${payload.qty}\n` +
                        `**Type:** ${payload.ticket_type}\n\n` +
                        `If you want to **change** anything, say: “update booking ${payload.id}”.`
                    );
                    return;
                }
            }

            appendMessage(message, 'user');
            input.value = '';

            // Show typing indicator
            const typingId = 'typing-' + Date.now();
            const container = document.getElementById('chat-messages');
            container.insertAdjacentHTML('beforeend', `
        <div id="${typingId}" class="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm self-start max-w-[88%] flex gap-1.5 items-center border border-slate-50">
            <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style="animation-delay:0.1s"></div>
            <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style="animation-delay:0.2s"></div>
        </div>`);
            container.scrollTop = container.scrollHeight;

            // Track dialog history locally for context compilation
            window._ddChatHistory = window._ddChatHistory || [];
            window._ddChatHistory.push({ role: 'user', content: message });
            if (window._ddChatHistory.length > 30) window._ddChatHistory = window._ddChatHistory.slice(-30);

            // Connect backend AI assistant API
            fetch('/api/assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    history: window._ddChatHistory,
                    context: {
                        activeTab: window._activeTab || 'overview',
                        selectedTemple: window._bookingState?.templeKey || '',
                        userPhone: window._currentUserPhone || ''
                    }
                })
            })
            .then(res => {
                if (!res.ok) throw new Error('API server responded with error status');
                return res.json();
            })
            .then(data => {
                document.getElementById(typingId)?.remove();
                const reply = data.reply || _fallbackReply(message);
                appendMessage(reply, 'bot');
                // Play notification chime
                playSoftChime();
                // Store bot reply in dialog history
                window._ddChatHistory.push({ role: 'assistant', content: reply });
            })
            .catch(err => {
                console.warn('AI Assistant API query failed, using offline fallback:', err);
                document.getElementById(typingId)?.remove();
                const reply = _fallbackReply(message);
                appendMessage(reply, 'bot');
                playSoftChime();
                window._ddChatHistory.push({ role: 'assistant', content: reply });
            });
        }

        function appendMessage(text, sender) {
            const container = document.getElementById('chat-messages');
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('p-3', 'rounded-2xl', 'text-[13px]', 'shadow-sm', 'max-w-[88%]', 'leading-relaxed', 'break-words');

            // Render **bold**, newlines, pipe tables simply
            let html = text
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
                .replace(/\n/g, '<br/>')
                .replace(/•/g, '&bull;');

            if (sender === 'user') {
                msgDiv.classList.add('bg-primary', 'text-white', 'self-end', 'rounded-tr-sm', 'ml-auto');
                html = html.replace(/class="font-bold"/g, 'class="font-bold text-white/90"');
            } else {
                msgDiv.classList.add('bg-white', 'text-slate-700', 'self-start', 'rounded-tl-sm', 'border', 'border-slate-50');
            }

            msgDiv.innerHTML = html;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
        }

        // ===== TRAVEL PLANNER LOGIC =====
        let plannerState = { temple: '', templeName: '', date: '', pilgrims: 2, time: 'morning', extraStops: [], budget: 'mid', nights: 1 };

        const DD_API_BASE = '';
        async function ddFetchJson(path, options) {
            return null; // Local-first
        }

        let plannerData = {};
        let bookingData = {
            tirupati: {
                announcements: [
                    { icon: "campaign", text: "Special Darshan for senior citizens starts at 04:00 PM.", color: "orange" },
                    { icon: "info", text: "New parking block P4 is now operational.", color: "blue" }
                ],
                poojas: [
                    { name: "Suprabhata Seva", price: "₹500", time: "03:00 AM", status: "Waitlist", desc: "Early morning ritual to wake the Lord." },
                    { name: "Kalyanotsavam", price: "₹1000", time: "10:00 AM", status: "Available", desc: "Celestial wedding ceremony of the Lord." },
                    { name: "Archana", price: "₹200", time: "Anytime", status: "Available", desc: "Personal prayer service with chanting." }
                ],
                prasadam: [
                    { id: "p1", name: "Tirupati Laddu (Big)", price: "₹50", desc: "The legendary world-famous prasadam." },
                    { id: "p2", name: "Vada (Pack of 2)", price: "₹40", desc: "Traditional spicy lentil donut." }
                ]
            },
            manjunatha: {
                announcements: [
                    { icon: "campaign", text: "Annadana timings extended till 03:00 PM today.", color: "green" }
                ],
                poojas: [
                    { name: "Rathotsava Seva", price: "₹1500", time: "06:00 PM", status: "Full", desc: "Grand chariot procession." },
                    { name: "Special Archana", price: "₹150", time: "Anytime", status: "Available", desc: "Special offering to Lord Manjunatha." }
                ],
                prasadam: [
                    { id: "pm1", name: "Dharmasthala Payasam", price: "₹30", desc: "Sweet milk pudding." }
                ]
            }
        };
        let parkingData = {
            tirupati: {
                name: "Tirupati Balaji",
                zones: [
                    { name: "Main Gate East", capacity: 48, filled: 28, distance: "0.5km", cols: 8, rows: 6, shape: "grid" },
                    { name: "Hilltop North", capacity: 32, filled: 12, distance: "0.3km", cols: 8, rows: 4, shape: "diagonal" },
                    { name: "Basement P2", capacity: 24, filled: 18, distance: "0.8km", cols: 6, rows: 4, shape: "circle" }
                ]
            },
            manjunatha: {
                name: "Dharmasthala Manjunatha",
                zones: [
                    { name: "River Bank P1", capacity: 48, filled: 30, distance: "1.2km", cols: 8, rows: 6, shape: "grid" },
                    { name: "Temple Entrance", capacity: 36, filled: 32, distance: "0.2km", cols: 6, rows: 6, shape: "diagonal" }
                ]
            },
            krishna: {
                name: "Udupi Krishna Mutt",
                zones: [
                    { name: "Main Mutt Lot P1", capacity: 40, filled: 15, distance: "0.4km", cols: 8, rows: 5, shape: "grid" },
                    { name: "Car Street Parking", capacity: 24, filled: 22, distance: "0.2km", cols: 6, rows: 4, shape: "diagonal" },
                    { name: "Mutt Complex Basement", capacity: 36, filled: 12, distance: "0.6km", cols: 6, rows: 6, shape: "circle" }
                ]
            },
            kukke: {
                name: "Kukke Subramanya",
                zones: [
                    { name: "Subramanya Main Lot", capacity: 48, filled: 45, distance: "0.3km", cols: 8, rows: 6, shape: "grid" },
                    { name: "River Side P2", capacity: 32, filled: 10, distance: "0.7km", cols: 8, rows: 4, shape: "diagonal" }
                ]
            }
        };

        let macroBookingControlState = { paused: false, reason: '', resumeAt: null };
        let macroBookingControlStream = null;
        let macroTicketInventoryState = {
            ticketsByTemple: {},
            selectedTicketIdByTemple: {},
            stream: null
        };

        function ddShowTrafficNotice(message, kind = 'info') {
            const host = document.body;
            if (!host) return;
            const note = document.createElement('div');
            const bg = kind === 'error' ? 'bg-rose-500' : kind === 'success' ? 'bg-emerald-500' : 'bg-primary';
            note.className = `${bg} fixed bottom-5 right-5 z-[250] max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl`;
            note.textContent = message;
            host.appendChild(note);
            setTimeout(() => {
                note.style.opacity = '0';
                note.style.transform = 'translateY(8px)';
                note.style.transition = 'all 180ms ease';
                setTimeout(() => note.remove(), 220);
            }, 2800);
        }

        function formatBookingResumeAt(value) {
            if (!value) return '';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        }

        function formatPublicTicketDate(value) {
            if (!value) return 'Open date';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        function getPublicTicketStatusMeta(status) {
            const normalized = String(status || 'OPEN').toUpperCase();
            if (normalized === 'CLOSED') return { label: 'Booking Closed', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
            if (normalized === 'BLOCKED') return { label: 'Currently Unavailable', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
            if (normalized === 'SOLD_OUT') return { label: 'Sold Out', badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
            return { label: 'Open', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
        }

        function getCurrentPublicTempleKey() {
            return document.getElementById('ticket-temple-select')?.value || 'tirupati';
        }

        function getCurrentTempleTickets() {
            return macroTicketInventoryState.ticketsByTemple[getCurrentPublicTempleKey()] || [];
        }

        function getSelectedMacroTicket() {
            const templeKey = getCurrentPublicTempleKey();
            const ticketId = macroTicketInventoryState.selectedTicketIdByTemple[templeKey];
            return getCurrentTempleTickets().find((ticket) => ticket.id === ticketId) || null;
        }

        function syncPublicTicketSelectOptions(templeKey) {
            const select = document.getElementById('ticket-type');
            if (!select) return;
            const tickets = macroTicketInventoryState.ticketsByTemple[templeKey] || [];
            const selectedId = macroTicketInventoryState.selectedTicketIdByTemple[templeKey] || '';
            select.innerHTML = '<option value="">Choose a live ticket</option>' + tickets.map((ticket) => `
        <option value="${ticket.id}" ${ticket.id === selectedId ? 'selected' : ''}>${ticket.event_name} · ${ticket.ticket_type} · ₹${Number(ticket.price || 0).toLocaleString('en-IN')}</option>
    `).join('');
        }

        function renderPublicTicketInventory(templeKey) {
            const container = document.getElementById('public-ticket-grid');
            const summary = document.getElementById('public-ticket-summary');
            const helper = document.getElementById('public-ticket-helper');
            const tickets = macroTicketInventoryState.ticketsByTemple[templeKey] || [];
            const selected = getSelectedMacroTicket();

            syncPublicTicketSelectOptions(templeKey);

            if (!container || !summary) return;

            if (!tickets.length) {
                summary.textContent = 'No live tickets published for this temple yet.';
                container.innerHTML = '<div class="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-400 text-center xl:col-span-2">No live tickets are available right now. Ask the admin to publish a ticket from Ticket Management.</div>';
                if (helper) helper.textContent = 'No ticket is available for booking right now.';
                renderMacroBookingControlState();
                return;
            }

            const openCount = tickets.filter(ticket => String(ticket.status).toUpperCase() === 'OPEN' && ticket.booking_enabled !== false).length;
            const availableSeats = tickets.reduce((sum, ticket) => sum + Number(ticket.available_seats || 0), 0);
            summary.textContent = `${openCount} open ticket${openCount === 1 ? '' : 's'} · ${availableSeats} seats remaining`;
            container.innerHTML = tickets.map((ticket) => {
                const selectedClass = selected?.id === ticket.id ? 'ring-2 ring-primary bg-primary/5' : 'bg-white';
                const status = getPublicTicketStatusMeta(ticket.status);
                const canSelect = String(ticket.status).toUpperCase() === 'OPEN' && ticket.booking_enabled !== false && Number(ticket.available_seats || 0) > 0;
                return `
            <button type="button" onclick="selectMacroTicket('${ticket.id}')" class="text-left rounded-2xl p-4 shadow-sm shadow-indigo-900/5 border border-slate-100 hover:border-primary/30 transition-all ${selectedClass}">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="font-black text-indigo-900 text-base">${ticket.event_name}</p>
                        <p class="text-xs text-slate-500 mt-1">${ticket.ticket_type} · ${formatPublicTicketDate(ticket.event_date)}${ticket.event_time ? ` · ${ticket.event_time}` : ''}</p>
                    </div>
                    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${status.badge}">
                        <span class="h-2 w-2 rounded-full ${status.dot}"></span>${status.label}
                    </span>
                </div>
                <div class="mt-4 flex items-center justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">Seats</p>
                        <p class="text-sm font-black text-indigo-900">${ticket.available_seats} available / ${ticket.total_seats} total</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">Price</p>
                        <p class="text-lg font-black text-primary">₹${Number(ticket.price || 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div class="mt-4 text-xs ${canSelect ? 'text-emerald-600' : 'text-slate-400'} font-semibold">${canSelect ? 'Tap to select this ticket for booking' : 'This ticket cannot be booked right now.'}</div>
            </button>
        `;
            }).join('');

            if (helper) {
                helper.textContent = selected
                    ? `${selected.event_name} selected. Limit ${selected.booking_limit || 1} seats per booking.`
                    : 'Choose one live ticket to load its date, slot, price, and booking status.';
            }

            renderMacroBookingControlState();
        }

        function applySelectedTicketToBookingForm(ticket) {
            const dateInput = document.getElementById('ticket-date');
            const slotSelect = document.getElementById('ticket-slot');
            const qtyInput = document.getElementById('ticket-qty');

            if (dateInput) {
                dateInput.value = ticket?.event_date || '';
                dateInput.disabled = Boolean(ticket?.event_date);
            }

            if (slotSelect) {
                const slotLabel = ticket?.event_time || 'Open Slot';
                slotSelect.innerHTML = `<option>${slotLabel}</option>`;
                slotSelect.disabled = Boolean(ticket?.event_time);
            }

            if (qtyInput) {
                const maxQty = ticket ? Math.max(1, Math.min(Number(ticket.available_seats || 1), Number(ticket.booking_limit || 1))) : 10;
                qtyInput.max = String(maxQty);
                if ((parseInt(qtyInput.value, 10) || 1) > maxQty) qtyInput.value = String(maxQty);
            }
        }

        function selectMacroTicket(ticketId) {
            const templeKey = getCurrentPublicTempleKey();
            const ticket = (macroTicketInventoryState.ticketsByTemple[templeKey] || []).find((item) => item.id === ticketId);
            if (!ticket) return;
            macroTicketInventoryState.selectedTicketIdByTemple[templeKey] = ticketId;
            applySelectedTicketToBookingForm(ticket);
            renderPublicTicketInventory(templeKey);
        }

        function handleTicketSelectionChange() {
            const select = document.getElementById('ticket-type');
            if (!select) return;
            if (!select.value) {
                const templeKey = getCurrentPublicTempleKey();
                delete macroTicketInventoryState.selectedTicketIdByTemple[templeKey];
                renderPublicTicketInventory(templeKey);
                return;
            }
            selectMacroTicket(select.value);
        }

        async function loadPublicTicketsForTemple(templeKey) {
            try {
                const response = await fetch(`/api/tickets?temple_key=${encodeURIComponent(templeKey)}`);
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error || 'Unable to load tickets');
                macroTicketInventoryState.ticketsByTemple[templeKey] = Array.isArray(payload.tickets) ? payload.tickets : [];
                if (!macroTicketInventoryState.selectedTicketIdByTemple[templeKey] && macroTicketInventoryState.ticketsByTemple[templeKey][0]) {
                    macroTicketInventoryState.selectedTicketIdByTemple[templeKey] = macroTicketInventoryState.ticketsByTemple[templeKey][0].id;
                }
                const selected = getSelectedMacroTicket() || macroTicketInventoryState.ticketsByTemple[templeKey][0] || null;
                if (selected) {
                    macroTicketInventoryState.selectedTicketIdByTemple[templeKey] = selected.id;
                    applySelectedTicketToBookingForm(selected);
                }
            } catch (error) {
                macroTicketInventoryState.ticketsByTemple[templeKey] = [];
            }
            renderPublicTicketInventory(templeKey);
        }

        function bindMacroTicketStream() {
            if (macroTicketInventoryState.stream || !window.EventSource) return;
            macroTicketInventoryState.stream = new EventSource('/api/tickets/stream');
            macroTicketInventoryState.stream.addEventListener('ticket-update', (event) => {
                try {
                    const payload = JSON.parse(event.data || '{}');
                    const ticket = payload.ticket;
                    const templeKey = getCurrentPublicTempleKey();
                    if (payload.type === 'ready') return;
                    if (ticket?.temple_key && ticket.temple_key !== templeKey) return;
                    loadPublicTicketsForTemple(templeKey);
                } catch (error) { }
            });
        }

        async function pollQueuedRequest(requestId) {
            while (true) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const res = await fetch(`/api/queue/status/${encodeURIComponent(requestId)}`);
                const data = await res.json();
                if (data.status === 'ready' || data.status === 'processed') return data;
                ddShowTrafficNotice(`High traffic detected. Queue position #${data.position || 0}. Estimated wait: ${data.estimatedWaitSeconds || 0}s.`, 'info');
            }
        }

        async function fetchWithQueue(url, options = {}) {
            const response = await fetch(url, options);
            if (response.status !== 202) return response;
            const payload = await response.json();
            ddShowTrafficNotice(`High traffic detected. You are position #${payload.position}. Estimated wait: ${payload.estimatedWaitSeconds}s.`, 'info');
            await pollQueuedRequest(payload.requestId);
            return fetch(url, options);
        }

        async function refreshMacroBookingControl() {
            try {
                const res = await fetch('/api/admin/booking-control');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Unable to load booking control');
                macroBookingControlState = {
                    paused: Boolean(data.paused),
                    reason: data.reason || '',
                    resumeAt: data.resumeAt || null
                };
            } catch (error) { }
            renderMacroBookingControlState();
        }

        function renderMacroBookingControlState() {
            const banner = document.getElementById('macroBookingPauseBanner');
            const submitBtn = document.getElementById('macro-booking-submit');
            const payBtn = document.getElementById('pay-now-btn');
            if (!banner || !submitBtn) return;
            const paused = Boolean(macroBookingControlState.paused);
            const selectedTicket = getSelectedMacroTicket();
            const selectedStatus = String(selectedTicket?.status || '').toUpperCase();
            const selectableTicket = Boolean(selectedTicket && selectedStatus === 'OPEN' && selectedTicket.booking_enabled !== false && Number(selectedTicket.available_seats || 0) > 0);
            banner.classList.add('hidden');
            if (paused) {
                banner.className = 'mb-6 rounded-2xl px-4 py-4 text-sm font-semibold bg-rose-50 text-rose-700';
                banner.innerHTML = `Ticket booking is temporarily paused${macroBookingControlState.reason ? `: ${macroBookingControlState.reason}` : '.'}${macroBookingControlState.resumeAt ? ` Resumes: ${formatBookingResumeAt(macroBookingControlState.resumeAt)}.` : ''}`;
                banner.classList.remove('hidden');
            } else if (!selectedTicket) {
                banner.className = 'mb-6 rounded-2xl px-4 py-4 text-sm font-semibold bg-slate-100 text-slate-600';
                banner.innerHTML = 'Choose a live ticket to continue with booking.';
                banner.classList.remove('hidden');
            } else if (!selectableTicket) {
                const statusMeta = getPublicTicketStatusMeta(selectedTicket.status);
                banner.className = `mb-6 rounded-2xl px-4 py-4 text-sm font-semibold ${statusMeta.badge.replace('text-', 'text-').replace('bg-', 'bg-')}`;
                banner.innerHTML = `${selectedTicket.event_name}: ${statusMeta.label}.`;
                banner.classList.remove('hidden');
            }
            submitBtn.disabled = paused || !selectableTicket;
            submitBtn.classList.toggle('opacity-60', paused || !selectableTicket);
            if (paused) submitBtn.textContent = 'Ticket Booking Paused';
            else if (!selectedTicket) submitBtn.textContent = 'Choose a Ticket to Continue';
            else if (selectedStatus === 'CLOSED') submitBtn.textContent = 'Booking Closed';
            else if (selectedStatus === 'BLOCKED') submitBtn.textContent = 'Currently Unavailable';
            else if (selectedStatus === 'SOLD_OUT' || Number(selectedTicket.available_seats || 0) <= 0) submitBtn.textContent = 'Sold Out';
            else submitBtn.textContent = 'Book Now';
            if (payBtn) {
                payBtn.disabled = paused || !selectableTicket;
                payBtn.classList.toggle('opacity-60', paused || !selectableTicket);
            }
        }

        function bindMacroBookingControlStream() {
            if (macroBookingControlStream || !window.EventSource) return;
            macroBookingControlStream = new EventSource('/api/admin/booking-control/stream');
            macroBookingControlStream.addEventListener('booking-control', (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    macroBookingControlState = payload.state || macroBookingControlState;
                    renderMacroBookingControlState();
                } catch (error) { }
            });
        }

        async function ddBootstrap() {
            // Already using mock data in declarations. 
            // If Admin has saved data in localStorage, it will be used instead.
            const existingRaw = localStorage.getItem('dd_parkingData');
            let needsReset = !existingRaw;
            if (existingRaw) {
                try {
                    const parsed = JSON.parse(existingRaw);
                    if (!parsed.krishna || !parsed.kukke) {
                        needsReset = true;
                    }
                } catch(e) { needsReset = true; }
            }
            if (needsReset) {
                localStorage.setItem('dd_parkingData', JSON.stringify(parkingData));
            }
            await refreshMacroBookingControl();
            await loadPublicTicketsForTemple(getCurrentPublicTempleKey());
            bindMacroBookingControlStream();
            bindMacroTicketStream();
        }

        async function ddCreateBooking(booking) {
            const response = await fetchWithQueue('/api/booking/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(booking)
            });
            const payload = await response.json();
            if (!response.ok) {
                if (response.status === 503 && payload?.error === 'BookingPaused') {
                    macroBookingControlState = {
                        paused: true,
                        reason: payload.reason || '',
                        resumeAt: payload.resumeAt || null
                    };
                    renderMacroBookingControlState();
                    throw new Error(payload.reason || 'Ticket booking is temporarily paused.');
                }
                throw new Error(payload?.error || 'Booking could not be saved.');

                btn.addEventListener('touchstart', startSosPress);
                btn.addEventListener('mouseup', endSosPress);
                btn.addEventListener('mouseleave', endSosPress);
                btn.addEventListener('touchend', endSosPress);
            }
            await ddBootstrap();
            updateBookingView();
            updateParkingView();
            loadProfileFromStorage();

            // Live link to Admin updates
            syncWithAdminData();
            setInterval(syncWithAdminData, 4000);
        });

        // ==================== PILGRIM DASHBOARD & AUTH SYNC ====================
        let activeProfileTab = 'info';

        function getToken() {
            return localStorage.getItem('dd_user_token');
        }

        function getProfile() {
            try {
                return JSON.parse(localStorage.getItem('dd_profile') || 'null');
            } catch {
                return null;
            }
        }

        function setProfile(p) {
            localStorage.setItem('dd_profile', JSON.stringify(p || null));
        }

        function isSignedIn() {
            return !!getToken();
        }

        function getUserEmoji(name) {
            const emojisList = ['🧘', '🕉️', '🛕', '🙏', '🌸', '☀️', '🕯️', '🔔', '🕊️', '🌅', '🦁', '🦉', '🦋', '🐘', '🌺'];
            if (!name) return '🧘';
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const index = Math.abs(hash) % emojisList.length;
            return emojisList[index];
        }

        let pendingProfileImageBase64 = null;

        function triggerProfileImageUpload() {
            if (!isSignedIn()) return;
            const fileInput = document.getElementById('profile-image-input');
            if (fileInput) fileInput.click();
        }

        function handleProfileImageFile(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (file.size > 2 * 1024 * 1024) {
                    alert('Profile image size should not exceed 2MB.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    pendingProfileImageBase64 = e.target.result;
                    // Update preview instantly
                    const container = document.getElementById('profile-avatar-container');
                    if (container) {
                        container.innerHTML = `<img src="${pendingProfileImageBase64}" class="w-full h-full object-cover rounded-xl" />`;
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        function loadProfileFromStorage() {
            const topBtn = document.getElementById('topbar-auth-btn');
            const openBtn = document.getElementById('open-profile-btn');
            const modalAvatar = document.getElementById('profile-avatar-container');
            
            if (isSignedIn()) {
                if (topBtn) {
                    topBtn.setAttribute('data-i18n', 'top-signout');
                    topBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">logout</span> Sign Out';
                    topBtn.className = "bg-red-500/20 text-red-200 border border-red-500/30 px-4 py-2 rounded-full text-xs font-bold transition-all hover:bg-red-500/30";
                }
                const p = getProfile() || {};
                const emoji = getUserEmoji(p.name || 'Pilgrim');
                
                if (openBtn) {
                    if (p.profile_image) {
                        openBtn.innerHTML = `<img src="${p.profile_image}" class="w-8 h-8 rounded-full border border-white/40 shadow-md object-cover hover:scale-105 transition-all select-none" />`;
                    } else {
                        openBtn.innerHTML = `<div class="w-8 h-8 rounded-full bg-white border border-slate-200/50 flex items-center justify-center p-1 shadow-md hover:scale-105 transition-all select-none"><img src="../assets/news/logo.png" class="w-6 h-6 object-contain" /></div>`;
                    }
                }
                if (modalAvatar) {
                    if (p.profile_image) {
                        modalAvatar.innerHTML = `<img src="${p.profile_image}" class="w-full h-full object-cover rounded-xl select-none" />`;
                    } else {
                        modalAvatar.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center p-2 select-none"><img src="../assets/news/logo.png" class="w-12 h-12 object-contain" /></div>`;
                    }
                }
            } else {
                if (topBtn) {
                    topBtn.setAttribute('data-i18n', 'top-signin');
                    topBtn.innerHTML = 'Sign in';
                    topBtn.className = "bg-white/15 text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors hover:bg-white/20";
                }
                if (openBtn) {
                    openBtn.innerHTML = '<span class="material-symbols-outlined text-white text-xl">account_circle</span>';
                }
                if (modalAvatar) {
                    modalAvatar.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center p-2 select-none"><img src="../assets/news/logo.png" class="w-12 h-12 object-contain" /></div>`;
                }
            }
            if (typeof changeLanguage === 'function') {
                changeLanguage(localStorage.getItem('dd-lang') || 'en');
            }
        }

        function switchProfileTab(tabId) {
            activeProfileTab = tabId;
            const tabs = ['info', 'bookings', 'donations'];
            
            tabs.forEach(t => {
                const btn = document.getElementById(`p-tab-${t}-btn`);
                const content = document.getElementById(`profile-tab-${t}`);
                if (t === tabId) {
                    if (btn) btn.className = "px-3 py-2 text-xs font-black tracking-wide uppercase border-b-2 border-[#E65100] text-[#E65100] transition-all";
                    if (content) content.classList.remove('hidden');
                } else {
                    if (btn) btn.className = "px-3 py-2 text-xs font-black tracking-wide uppercase border-b-2 border-transparent text-slate-500 hover:text-[#E65100] transition-all";
                    if (content) content.classList.add('hidden');
                }
            });

            if (tabId === 'bookings') fetchPilgrimBookingsBackend();
            if (tabId === 'donations') fetchPilgrimDonationsBackend();
        }

        async function openProfileModal() {
            const modal = document.getElementById('profile-modal');
            if (!modal) return;

            const signedOutView = document.getElementById('profile-signed-out-view');
            const tabsNav = document.getElementById('profile-tabs-nav');
            const footerSync = document.getElementById('profile-footer-sync');
            const avatarContainer = document.getElementById('profile-avatar-container');
            const badgeLabel = document.getElementById('profile-badge-label');
            const nameHeader = document.getElementById('profile-header-name');
            const emailHeader = document.getElementById('profile-header-email');

            if (!isSignedIn()) {
                signedOutView.classList.remove('hidden');
                tabsNav.classList.add('hidden');
                document.getElementById('profile-tab-info').classList.add('hidden');
                document.getElementById('profile-tab-bookings').classList.add('hidden');
                document.getElementById('profile-tab-donations').classList.add('hidden');

                if (avatarContainer) avatarContainer.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center p-2 select-none"><img src="../assets/news/logo.png" class="w-12 h-12 object-contain" /></div>`;
                if (badgeLabel) badgeLabel.innerText = "Guest";
                if (nameHeader) nameHeader.innerText = "Sanctuary Guest";
                if (emailHeader) emailHeader.innerText = "Access all booking details";
                if (footerSync) footerSync.innerText = "Offline Guest Access Mode";

                modal.classList.remove('hidden');
                modal.classList.add('flex');
                return;
            }

            signedOutView.classList.add('hidden');
            tabsNav.classList.remove('hidden');
            switchProfileTab('info');

            const p = getProfile() || {};
            
            document.getElementById('profile-input-name').value = p.name || '';
            document.getElementById('profile-input-phone').value = p.phone || '';
            document.getElementById('reg-email-display').value = p.email || '';
            document.getElementById('profile-input-city').value = p.city || '';
            document.getElementById('profile-input-religion').value = p.chosen_religion || 'hindu';
            document.getElementById('profile-input-lang').value = p.language || 'en';

            if (nameHeader) nameHeader.innerText = p.name || 'Registered Pilgrim';
            if (emailHeader) emailHeader.innerText = p.email || p.phone;
            if (badgeLabel) badgeLabel.innerText = "Sanctuary Member";
            if (footerSync) footerSync.innerText = `Secured Live Sync · Last Updated ${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Today'}`;

            if (avatarContainer) {
                if (p.profile_image) {
                    avatarContainer.innerHTML = `<img src="${p.profile_image}" class="w-full h-full object-cover rounded-xl select-none" />`;
                } else {
                    avatarContainer.innerHTML = `<div class="w-full h-full bg-white flex items-center justify-center p-2 select-none"><img src="../assets/news/logo.png" class="w-12 h-12 object-contain" /></div>`;
                }
            }

            modal.classList.remove('hidden');
            modal.classList.add('flex');

            refreshUserProfileFromBackend();
        }

        function closeProfileModal() {
            const modal = document.getElementById('profile-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function refreshUserProfileFromBackend() {
            try {
                const res = await fetch('/api/user/profile', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (res.status === 401 || res.status === 403) {
                    signOutProfileBackend();
                    return;
                }
                if (!res.ok) return;

                const user = await res.json();
                setProfile(user);
                loadProfileFromStorage();
            } catch (err) {
                console.warn('[divyadarshan] offline profile fallback used:', err.message);
            }
        }

        async function updatePilgrimProfileBackend() {
            const name = document.getElementById('profile-input-name').value.trim();
            const city = document.getElementById('profile-input-city').value.trim();
            const chosen_religion = document.getElementById('profile-input-religion').value;
            const language = document.getElementById('profile-input-lang').value;
            const btn = document.getElementById('profile-update-btn');

            if (!name) {
                alert('Spiritual Full Name is required.');
                return;
            }

            const originalBtnText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[12px]">sync</span> Saving changes…';

            const payloadData = { name, city, chosen_religion, language };
            if (pendingProfileImageBase64) {
                payloadData.profile_image = pendingProfileImageBase64;
            }

            try {
                const res = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(payloadData)
                });
                const data = await res.json();

                if (!res.ok) {
                    alert(data.error || 'Failed to update profile.');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnText;
                    return;
                }

                setProfile(data.user);
                pendingProfileImageBase64 = null;
                loadProfileFromStorage();
                
                const nameHeader = document.getElementById('profile-header-name');
                if (nameHeader) nameHeader.innerText = data.user.name;

                // Add notification
                let notes = JSON.parse(localStorage.getItem('globalNotifications')) || [];
                notes.unshift({ msg: `Spiritual Profile details updated successfully!`, time: new Date().toLocaleString(), type: 'system' });
                if(notes.length > 30) notes.pop();
                localStorage.setItem('globalNotifications', JSON.stringify(notes));

                alert('Profile updated successfully on the sanctuary server!');
                
                btn.disabled = false;
                btn.innerHTML = originalBtnText;

            } catch (err) {
                alert('Spiritual connection failed. Saving locally.');
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
        }

        async function fetchPilgrimBookingsBackend() {
            const loader = document.getElementById('profile-bookings-loading');
            const empty = document.getElementById('profile-bookings-empty');
            const list = document.getElementById('profile-bookings-list');
            const countBadge = document.getElementById('p-booking-count-badge');

            if (!loader || !empty || !list) return;

            loader.classList.remove('hidden');
            empty.classList.add('hidden');
            list.classList.add('hidden');

            try {
                const res = await fetch('/api/user/bookings', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!res.ok) throw new Error('Api returned error');

                const bookings = await res.json();
                loader.classList.add('hidden');

                if (countBadge) {
                    if (bookings.length > 0) {
                        countBadge.innerText = bookings.length;
                        countBadge.classList.remove('hidden');
                    } else {
                        countBadge.classList.add('hidden');
                    }
                }

                if (!bookings.length) {
                    empty.classList.remove('hidden');
                    return;
                }

                // Render list
                list.innerHTML = bookings.map(b => {
                    const statusClass = b.status === 'Confirmed' || b.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : b.status === 'Pending' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-slate-100 text-slate-600';

                    return `
                        <div class="border border-slate-100 hover:border-orange-100 bg-slate-50/50 hover:bg-orange-50/20 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex justify-between items-center group"
                             onclick="window.location.href='/booking/ticket/${b.id}'">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[15px] text-orange-500">temple_hindu</span>
                                    <h5 class="text-xs font-extrabold text-slate-800">${b.temple_name || b.temple_slug}</h5>
                                </div>
                                <div class="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-semibold">
                                    <span>Date: ${b.visit_date}</span>
                                    <span>·</span>
                                    <span>Slot: ${b.slot}</span>
                                    <span>·</span>
                                    <span>Qty: ${b.qty}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2.5">
                                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${statusClass}">${b.status || 'Pending'}</span>
                                <span class="material-symbols-outlined text-slate-400 text-base group-hover:text-orange-500 transition-colors">arrow_forward</span>
                            </div>
                        </div>
                    `;
                }).join('');

                list.classList.remove('hidden');

            } catch (err) {
                loader.classList.add('hidden');
                empty.classList.remove('hidden');
            }
        }

        async function fetchPilgrimDonationsBackend() {
            const loader = document.getElementById('profile-donations-loading');
            const empty = document.getElementById('profile-donations-empty');
            const content = document.getElementById('profile-donations-content');
            const list = document.getElementById('profile-donations-list');
            const totalVal = document.getElementById('p-donation-total-val');

            if (!loader || !empty || !content || !list || !totalVal) return;

            loader.classList.remove('hidden');
            empty.classList.add('hidden');
            content.classList.add('hidden');

            try {
                const res = await fetch('/api/user/donations', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!res.ok) throw new Error('Api returned error');

                const donations = await res.json();
                loader.classList.add('hidden');

                if (!donations.length) {
                    empty.classList.remove('hidden');
                    return;
                }

                // Sum total
                const total = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
                totalVal.innerText = `₹ ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

                // Render list
                list.innerHTML = donations.map(d => `
                    <div class="border border-slate-100 bg-white rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-[#E65100]">favorite</span>
                                <span class="text-xs font-bold text-slate-800">${d.temple_name || d.temple_slug}</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-500 font-semibold">
                                <span>Cause: ${d.cause || 'General Trust Fund'}</span>
                                <span>·</span>
                                <span>Ref: ${d.id || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-extrabold text-[#E65100]">₹ ${Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <p class="text-[8px] text-slate-400 font-semibold mt-0.5">${new Date(d.created_at || d.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                `).join('');

                content.classList.remove('hidden');

            } catch (err) {
                loader.classList.add('hidden');
                empty.classList.remove('hidden');
            }
        }

        function signOutProfileBackend() {
            localStorage.removeItem('dd_user_token');
            localStorage.removeItem('dd_profile');

            loadProfileFromStorage();
            closeProfileModal();

            let notes = JSON.parse(localStorage.getItem('globalNotifications')) || [];
            notes.unshift({ msg: `Sanctuary session signed out securely.`, time: new Date().toLocaleString(), type: 'system' });
            if(notes.length > 30) notes.pop();
            localStorage.setItem('globalNotifications', JSON.stringify(notes));

            alert('Signed out successfully. Returning to Guest access.');
        }

        function handleTopbarAuth() {
            if (isSignedIn()) {
                signOutProfileBackend();
                return;
            }
            window.location.href = '/login/index.html';
        }


            document.querySelectorAll(linkSelector).forEach((link) => {
                if (link.dataset.ddPrefetchAttached) return;
                link.dataset.ddPrefetchAttached = 'true';
                link.addEventListener('mouseenter', () => prefetchTemplePage(link.href));
                link.addEventListener('touchstart', () => prefetchTemplePage(link.href), { passive: true });
            });
            if (!templePrefetchInitialized) {
                templePrefetchInitialized = true;
                document.body.addEventListener('mouseover', (event) => {
                    const link = event.target.closest('a[href^="/temple/"]');
                    if (link) prefetchTemplePage(link.href);
                }, { passive: true });
            }
        }

        // ==================== NAVBAR + DRAWER MERGE ====================
        function toggleDrawer() {
            const drawer = document.getElementById('dd-drawer');
            const overlay = document.getElementById('dd-drawer-overlay');
            if (drawer) drawer.classList.toggle('open');
            if (overlay) overlay.classList.toggle('open');
        }

        function toggleDdNotif(event) {
            event.stopPropagation();
            const panel = document.getElementById('dd-notif-panel');
            if (panel) panel.classList.toggle('open');
        }

        document.addEventListener('click', (event) => {
            const panel = document.getElementById('dd-notif-panel');
            const btn = document.getElementById('dd-notif-btn');
            if (panel && !panel.contains(event.target) && btn && !btn.contains(event.target)) {
                panel.classList.remove('open');
            }
        });

        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                const input = document.getElementById('dd-main-search');
                if (input) input.focus();
            }
        });

        const ddTempleList = [
            { name: 'Tirupati Balaji', loc: 'Tirupati, Andhra Pradesh', deity: 'Lord Venkateswara' },
            { name: 'Tirumala Venkateswara', loc: 'Tirumala, Andhra Pradesh', deity: 'Lord Venkateswara' },
            { name: 'Dharmasthala Manjunatha', loc: 'Dharmasthala, Karnataka', deity: 'Lord Manjunatha' },
            { name: 'Kukke Subramanya', loc: 'Subramanya, Karnataka', deity: 'Lord Subramanya' },
            { name: 'Kollur Mookambika', loc: 'Kollur, Karnataka', deity: 'Goddess Mookambika' },
            { name: 'Udupi Sri Krishna', loc: 'Udupi, Karnataka', deity: 'Lord Krishna' },
            { name: 'Horanadu Annapoorneshwari', loc: 'Horanadu, Karnataka', deity: 'Goddess Annapoorneshwari' },
            { name: 'Sringeri Sharadamba', loc: 'Sringeri, Karnataka', deity: 'Goddess Sharadamba' },
            { name: 'Mantralayam Raghavendra', loc: 'Mantralayam, Andhra Pradesh', deity: 'Sri Raghavendra Swamy' },
            { name: 'Chamundeshwari Temple', loc: 'Mysuru, Karnataka', deity: 'Goddess Chamundeshwari' },
            { name: 'Mahabaleshwar Temple', loc: 'Gokarna, Karnataka', deity: 'Lord Shiva' },
            { name: 'Murdeshwar Temple', loc: 'Murdeshwar, Karnataka', deity: 'Lord Shiva' },
            { name: 'Srisailam Mallikarjuna', loc: 'Srisailam, Andhra Pradesh', deity: 'Lord Mallikarjuna' },
            { name: 'Kanaka Durga Temple', loc: 'Vijayawada, Andhra Pradesh', deity: 'Goddess Kanaka Durga' },
            { name: 'Simhachalam Varaha Narasimha', loc: 'Visakhapatnam, Andhra Pradesh', deity: 'Lord Narasimha' },
            { name: 'Talakaveri Temple', loc: 'Coorg, Karnataka', deity: 'Goddess Kaveri' },
            { name: 'Nanjanagud Srikanteshwara', loc: 'Nanjanagud, Karnataka', deity: 'Lord Shiva' },
            { name: 'Melukote Cheluvarayaswamy', loc: 'Melukote, Karnataka', deity: 'Lord Cheluvarayaswamy' },
            { name: 'Yaganti Uma Maheshwara', loc: 'Kurnool, Andhra Pradesh', deity: 'Lord Shiva' },
            { name: 'Ahobilam Narasimha', loc: 'Ahobilam, Andhra Pradesh', deity: 'Lord Narasimha' },
            { name: 'Srikalahasti Temple', loc: 'Srikalahasti, Andhra Pradesh', deity: 'Lord Shiva' },
            { name: 'Kashi Vishwanath', loc: 'Varanasi, Uttar Pradesh', deity: 'Lord Shiva' },
            { name: 'Somnath Temple', loc: 'Somnath, Gujarat', deity: 'Lord Shiva' },
            { name: 'Puri Jagannath', loc: 'Puri, Odisha', deity: 'Lord Jagannath' },
            { name: 'Sabarimala Ayyappa', loc: 'Pathanamthitta, Kerala', deity: 'Lord Ayyappa' },
            { name: 'Guruvayur Krishna', loc: 'Guruvayur, Kerala', deity: 'Lord Krishna' },
            { name: 'Padmanabhaswamy', loc: 'Thiruvananthapuram, Kerala', deity: 'Lord Vishnu' },
            { name: 'Meenakshi Amman Temple', loc: 'Madurai, Tamil Nadu', deity: 'Goddess Meenakshi' },
            { name: 'Kedarnath Temple', loc: 'Rudraprayag, Uttarakhand', deity: 'Lord Shiva' }
        ];

        function ddSearchFilter() {
            const input = document.getElementById('dd-main-search');
            const results = document.getElementById('dd-search-results');
            const clearBtn = document.getElementById('dd-search-clear');
            const kbdHint = document.getElementById('dd-search-kbd');
            if (!input || !results) return;

            const query = String(input.value || '').trim().toLowerCase();
            if (query.length > 0) {
                if (clearBtn) clearBtn.classList.remove('hidden');
                if (kbdHint) kbdHint.classList.add('hidden');
            } else {
                if (clearBtn) clearBtn.classList.add('hidden');
                if (kbdHint) kbdHint.classList.remove('hidden');
            }

            if (!query) {
                results.classList.add('hidden');
                return;
            }

            const matches = ddTempleList.filter((temple) =>
                temple.name.toLowerCase().includes(query) ||
                temple.loc.toLowerCase().includes(query) ||
                temple.deity.toLowerCase().includes(query)
            );

            if (!matches.length) {
                results.innerHTML = `<div class="px-4 py-5 text-center"><span class="material-symbols-outlined text-slate-300 text-2xl">search_off</span><p class="text-slate-400 text-xs font-medium mt-1">No temples found for "${query}"</p></div>`;
                results.classList.remove('hidden');
                return;
            }

            const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const highlight = (value) => value.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark class="bg-orange-100 text-orange-800 rounded px-0.5">$1</mark>');

            results.innerHTML = matches.map((temple) => `
        <div class="px-4 py-2.5 hover:bg-orange-50/50 cursor-pointer transition-colors flex items-center gap-3 group/r" onclick="ddSearchSelect('${temple.name.replace(/'/g, "\\'")}')">
            <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover/r:bg-orange-100 transition-colors">
                <span class="material-symbols-outlined text-orange-500 text-base">temple_hindu</span>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-slate-800 text-xs font-bold truncate">${highlight(temple.name)}</p>
                <p class="text-slate-400 text-[10px] truncate">${highlight(temple.loc)} · ${temple.deity}</p>
            </div>
            <span class="material-symbols-outlined text-slate-300 text-sm opacity-0 group-hover/r:opacity-100 transition-opacity">arrow_forward</span>
        </div>
    `).join('');
            results.classList.remove('hidden');
        }

        function ddSearchClear(event) {
            event.stopPropagation();
            const input = document.getElementById('dd-main-search');
            const results = document.getElementById('dd-search-results');
            const clearBtn = document.getElementById('dd-search-clear');
            if (input) { input.value = ''; input.focus(); }
            if (results) results.classList.add('hidden');
            if (clearBtn) clearBtn.classList.add('hidden');
        }

        function ddSearchSelect(name) {
            const input = document.getElementById('dd-main-search');
            const results = document.getElementById('dd-search-results');
            if (input) input.value = name;
            if (results) results.classList.add('hidden');
            closeSearchOverlay();
        }

        // ── Search Overlay helpers ────────────────────────────────
        function openSearchOverlay() {
            const overlay = document.getElementById('dd-search-overlay');
            const input = document.getElementById('dd-main-search');
            if (!overlay) return;
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            setTimeout(() => { if (input) input.focus(); }, 80);
        }

        function closeSearchOverlay(event) {
            // If called from the backdrop click, only close when clicking the backdrop itself
            if (event && event.target !== document.getElementById('dd-search-overlay')) return;
            const overlay = document.getElementById('dd-search-overlay');
            const input = document.getElementById('dd-main-search');
            const results = document.getElementById('dd-search-results');
            if (overlay) overlay.classList.add('hidden');
            if (input) input.value = '';
            if (results) results.classList.add('hidden');
            document.body.style.overflow = '';
        }

        // Keyboard shortcuts: Ctrl+K to open, Escape to close
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const overlay = document.getElementById('dd-search-overlay');
                if (overlay && overlay.classList.contains('hidden')) openSearchOverlay();
                else closeSearchOverlay();
            }
            if (e.key === 'Escape') {
                const overlay = document.getElementById('dd-search-overlay');
                if (overlay && !overlay.classList.contains('hidden')) {
                    const input = document.getElementById('dd-main-search');
                    const results = document.getElementById('dd-search-results');
                    overlay.classList.add('hidden');
                    if (input) input.value = '';
                    if (results) results.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }
        });

        let sahayakaTemple = 'dharmasthala';
        let sahayakaListening = false;
        let sahayakaRecognition = null;

        const sahayakaTranslations = {
            dharmasthala: {
                templeName: 'Dharmasthala Manjunatha',
                lang: 'Kannada',
                langCode: 'kn-IN',
                phrases: {
                    'Where is parking?': 'ಪಾರ್ಕಿಂಗ್ ಎಲ್ಲಿ ಇದೆ?',
                    'Where is Gate 2?': 'ಗೇಟ್ 2 ಎಲ್ಲಿ ಇದೆ?',
                    'Where is the washroom?': 'ಶೌಚಾಲಯ ಎಲ್ಲಿ ಇದೆ?',
                    'Where is the darshan queue?': 'ದರ್ಶನ ಸಾಲು ಎಲ್ಲಿ ಇದೆ?',
                    'Where is the exit gate?': 'ಹೊರಹೋಗುವ ದ್ವಾರ ಎಲ್ಲಿ ಇದೆ?',
                    'Where is the help desk?': 'ಸಹಾಯ ಕೌಂಟರ್ ಎಲ್ಲಿ ಇದೆ?',
                    'Where is the prasadam counter?': 'ಪ್ರಸಾದ ಕೌಂಟರ್ ಎಲ್ಲಿ ಇದೆ?',
                    'I need medical help': 'ನನಗೆ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಬೇಕು',
                    'Thank you': 'ಧನ್ಯವಾದಗಳು',
                    'How long is the wait?': 'ಎಷ್ಟು ಸಮಯ ಕಾಯಬೇಕು?',
                    'Where can I buy flowers?': 'ಹೂವುಗಳನ್ನು ಎಲ್ಲಿ ಖರೀದಿಸಬಹುದು?',
                    'Is there a shoe counter?': 'ಪಾದರಕ್ಷೆ ಕೌಂಟರ್ ಇದೆಯೆ?',
                    'Where is drinking water?': 'ಕುಡಿಯುವ ನೀರು ಎಲ್ಲಿ ಇದೆ?'
                }
            },
            tirupati: {
                templeName: 'Tirupati Balaji',
                lang: 'Telugu',
                langCode: 'te-IN',
                phrases: {
                    'Where is parking?': 'పార్కింగ్ ఎక్కడ ఉంది?',
                    'Where is Gate 2?': 'గేట్ 2 ఎక్కడ ఉంది?',
                    'Where is the washroom?': 'మరుగుదొడ్డి ఎక్కడ ఉంది?',
                    'Where is the darshan queue?': 'దర్శనం క్యూ ఎక్కడ ఉంది?',
                    'Where is the exit gate?': 'బయటకు వెళ్ళే గేటు ఎక్కడ ఉంది?',
                    'Where is the help desk?': 'సహాయ కేంద్రం ఎక్కడ ఉంది?',
                    'Where is the prasadam counter?': 'ప్రసాదం కౌంటర్ ఎక్కడ ఉంది?',
                    'I need medical help': 'నాకు వైద్య సహాయం కావాలి',
                    'Thank you': 'ధన్యవాదాలు',
                    'How long is the wait?': 'ఎంత సేపు వేచి ఉండాలి?',
                    'Where can I buy flowers?': 'పువ్వులు ఎక్కడ దొరుకుతాయి?',
                    'Is there a shoe counter?': 'చెప్పులు కౌంటర్ ఉందా?',
                    'Where is drinking water?': 'తాగునీరు ఎక్కడ ఉంది?'
                }
            }
        };

        const sahayakaQuickHelp = [
            { key: 'Where is parking?', icon: 'local_parking', label: 'Parking' },
            { key: 'Where is the darshan queue?', icon: 'groups', label: 'Darshan Queue' },
            { key: 'Where is the exit gate?', icon: 'logout', label: 'Exit Gate' },
            { key: 'Where is the washroom?', icon: 'wc', label: 'Washroom' },
            { key: 'Where is the help desk?', icon: 'help', label: 'Help Desk' },
            { key: 'Where is the prasadam counter?', icon: 'restaurant', label: 'Prasadam' },
            { key: 'I need medical help', icon: 'medical_services', label: 'Medical Help' }
        ];

        function toggleSahayaka() {
            const panel = document.getElementById('sahayaka-panel');
            if (!panel) return;

            if (panel.classList.contains('hidden')) {
                panel.classList.remove('hidden');
                panel.classList.add('flex');
                setTimeout(() => {
                    const inner = panel.querySelector('.sahayaka-inner');
                    if (inner) inner.classList.add('sahayaka-open');
                }, 10);
                sahayakaRenderQuickHelp();
                sahayakaUpdateHeader();
            } else {
                closeSahayaka();
            }
        }

        function closeSahayaka() {
            const panel = document.getElementById('sahayaka-panel');
            if (!panel) return;
            stopSahayakaListening();
            const inner = panel.querySelector('.sahayaka-inner');
            if (inner) inner.classList.remove('sahayaka-open');
            setTimeout(() => {
                panel.classList.add('hidden');
                panel.classList.remove('flex');
            }, 300);
        }

        function sahayakaUpdateHeader() {
            const data = sahayakaTranslations[sahayakaTemple];
            const templeEl = document.getElementById('sahayaka-temple-name');
            const langEl = document.getElementById('sahayaka-lang-label');
            if (templeEl) templeEl.textContent = data.templeName;
            if (langEl) langEl.textContent = `English ↔ ${data.lang}`;
        }

        function sahayakaSwitchTemple(key) {
            sahayakaTemple = key;
            sahayakaUpdateHeader();
            sahayakaRenderQuickHelp();
            sahayakaClearOutput();
        }

        function sahayakaRenderQuickHelp() {
            const grid = document.getElementById('sahayaka-quick-grid');
            if (!grid) return;

            grid.innerHTML = sahayakaQuickHelp.map((item) => `
        <button onclick="sahayakaTranslate('${item.key.replace(/'/g, "\\'")}')" class="flex flex-col items-center gap-1.5 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-xl p-3 transition-all hover:-translate-y-0.5 active:scale-95">
            <span class="material-symbols-outlined text-slate-500 text-xl">${item.icon}</span>
            <span class="text-[10px] font-bold text-slate-600">${item.label}</span>
        </button>
    `).join('');
        }

        function findBestTranslation(input, phrases) {
            const normalized = input.toLowerCase().replace(/[?.,!]/g, '').trim();
            for (const [key, value] of Object.entries(phrases)) {
                if (key.toLowerCase().replace(/[?.,!]/g, '').trim() === normalized) {
                    return { matchedKey: key, translation: value };
                }
            }
            for (const [key, value] of Object.entries(phrases)) {
                const inputWords = normalized.split(/\s+/);
                const keyWords = key.toLowerCase().replace(/[?.,!]/g, '').split(/\s+/);
                const overlap = inputWords.filter((word) => keyWords.includes(word)).length;
                if (overlap >= 2) {
                    return { matchedKey: key, translation: value };
                }
            }
            return { matchedKey: null, translation: null };
        }

        function sahayakaTranslate(englishText) {
            const data = sahayakaTranslations[sahayakaTemple];
            const result = findBestTranslation(englishText, data.phrases);
            const output = document.getElementById('sahayaka-output');
            const translationEl = document.getElementById('sahayaka-trans-text');
            const langEl = document.getElementById('sahayaka-trans-lang');
            const speakBtn = document.getElementById('sahayaka-speak-btn');
            const notFound = document.getElementById('sahayaka-not-found');
            if (!output || !translationEl || !langEl || !speakBtn || !notFound) return;

            output.classList.remove('hidden');
            document.getElementById('sahayaka-en-text').textContent = result.matchedKey || englishText;

            if (result.translation) {
                translationEl.textContent = result.translation;
                langEl.textContent = `${data.lang} Translation`;
                speakBtn.classList.remove('hidden');
                notFound.classList.add('hidden');
            } else {
                translationEl.textContent = '';
                langEl.textContent = `${data.lang} Translation`;
                speakBtn.classList.add('hidden');
                notFound.classList.remove('hidden');
            }
        }

        let sahayakaVoices = [];

        function loadSahayakaVoices() {
            sahayakaVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
        }

        function findSahayakaVoice(langCode) {
            const prefix = langCode.split('-')[0];
            if (!sahayakaVoices.length) loadSahayakaVoices();
            return (
                sahayakaVoices.find((voice) => voice.lang === langCode && voice.name.toLowerCase().includes('google')) ||
                sahayakaVoices.find((voice) => voice.lang === langCode) ||
                sahayakaVoices.find((voice) => voice.lang.startsWith(`${prefix}-`)) ||
                sahayakaVoices.find((voice) => voice.lang.startsWith(prefix)) ||
                sahayakaVoices.find((voice) => voice.lang === 'hi-IN') ||
                sahayakaVoices.find((voice) => voice.lang.endsWith('-IN')) ||
                null
            );
        }

        loadSahayakaVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadSahayakaVoices;
        }

        function sahayakaSpeak() {
            const textEl = document.getElementById('sahayaka-trans-text');
            const btn = document.getElementById('sahayaka-speak-btn');
            if (!textEl || !btn) return;

            const text = textEl.textContent.trim();
            if (!text) return;

            if (window.speechSynthesis) window.speechSynthesis.cancel();

            btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">volume_up</span> Speaking…';

            const utterance = new SpeechSynthesisUtterance(text);
            const data = sahayakaTranslations[sahayakaTemple];
            utterance.rate = 0.82;
            utterance.pitch = 1;
            utterance.volume = 1;

            const voice = findSahayakaVoice(data.langCode);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            } else {
                utterance.lang = data.langCode;
            }

            utterance.onend = () => {
                btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">volume_up</span> Play';
            };
            utterance.onerror = () => {
                btn.innerHTML = '<span class="material-symbols-outlined text-[14px]">volume_up</span> Play';
            };

            if (window.speechSynthesis) {
                window.speechSynthesis.speak(utterance);
            }
        }

        function sahayakaTextSubmit() {
            const input = document.getElementById('sahayaka-text-input');
            if (!input) return;
            const value = input.value.trim();
            if (!value) return;
            sahayakaTranslate(value);
            input.value = '';
        }

        function sahayakaClearOutput() {
            const output = document.getElementById('sahayaka-output');
            if (output) output.classList.add('hidden');
        }

        function startSahayakaListening() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Speech recognition is not supported in this browser. Please use Chrome.');
                return;
            }

            sahayakaRecognition = new SpeechRecognition();
            sahayakaRecognition.lang = 'en-US';
            sahayakaRecognition.interimResults = false;
            sahayakaRecognition.maxAlternatives = 1;

            const micBtn = document.getElementById('sahayaka-mic-btn');
            const micStatus = document.getElementById('sahayaka-mic-status');

            sahayakaRecognition.onstart = () => {
                sahayakaListening = true;
                if (micBtn) micBtn.classList.add('sahayaka-mic-active');
                if (micStatus) {
                    micStatus.textContent = 'Listening... speak now';
                    micStatus.classList.remove('hidden');
                }
                // Animate the voice FAB button to red while listening
                const voiceFab = document.getElementById('dd-voice-fab');
                const voiceIcon = document.getElementById('dd-voice-mic-icon');
                if (voiceFab) {
                    voiceFab.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                    voiceFab.style.boxShadow = '0 6px 24px rgba(220,38,38,0.55)';
                }
                if (voiceIcon) voiceIcon.style.animation = 'sahayakaPulse 0.8s infinite';
            };

            sahayakaRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                sahayakaTranslate(transcript);
            };

            sahayakaRecognition.onerror = (event) => {
                if (event.error === 'not-allowed') {
                    alert('Microphone access is required for voice assistance.');
                }
                stopSahayakaListening();
            };

            sahayakaRecognition.onend = () => stopSahayakaListening();
            sahayakaRecognition.start();
        }

        function stopSahayakaListening() {
            sahayakaListening = false;
            const micBtn = document.getElementById('sahayaka-mic-btn');
            const micStatus = document.getElementById('sahayaka-mic-status');
            if (micBtn) micBtn.classList.remove('sahayaka-mic-active');
            if (micStatus) micStatus.classList.add('hidden');
            // Reset voice FAB appearance
            const voiceFab = document.getElementById('dd-voice-fab');
            const voiceIcon = document.getElementById('dd-voice-mic-icon');
            if (voiceFab) {
                voiceFab.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
                voiceFab.style.boxShadow = '0 6px 24px rgba(15,23,42,0.55)';
            }
            if (voiceIcon) voiceIcon.style.animation = '';
            if (sahayakaRecognition) {
                try {
                    sahayakaRecognition.stop();
                } catch (error) {
                    // Ignore stop errors from already-ended sessions.
                }
            }
        }

        function toggleSahayakaMic() {
            if (sahayakaListening) stopSahayakaListening();
            else startSahayakaListening();
        }



        // Initialize components on load

        document.addEventListener("DOMContentLoaded", async () => {

            // Apply translatability targets programmatically
            document.querySelectorAll('[data-i18n]').forEach(el => el.classList.add('dd-translatable'));
            
            // Sync active language preferences
            if (activeLanguage) {
                changeLanguage(activeLanguage);
            }

            const initTasks = [
                ddBootstrap().catch(() => { }),
                loadRegisteredTemples().catch(() => { }),
            ];
            loadProfileFromStorage();
        });
        

// Upgraded Smart Cross-Page Router Tab Handler
function showView(viewId) {
    const targetElement = document.getElementById(viewId);
    
    if (targetElement) {
        // View exists locally on this page! Renders instantly.
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        let scrollTargetId = null;
        if (viewId === 'view-live-status' || viewId === 'view-famous-temples') {
            const liveStatusEl = document.getElementById('view-live-status');
            const famousTemplesEl = document.getElementById('view-famous-temples');
            if (liveStatusEl) liveStatusEl.classList.remove('hidden');
            if (famousTemplesEl) famousTemplesEl.classList.remove('hidden');
            if (viewId === 'view-famous-temples') {
                scrollTargetId = 'view-famous-temples';
            }
        } else {
            targetElement.classList.remove('hidden');
        }

        if (viewId === 'view-news' && typeof renderNews === 'function') {
            renderNews();
        }

        if (viewId === 'view-parking') {
            const state = window._bookingState || {};
            if (state.templeKey) {
                const selectEl = document.getElementById('parking-temple-select');
                if (selectEl) {
                    for (let i = 0; i < selectEl.options.length; i++) {
                        if (selectEl.options[i].value === state.templeKey) {
                            selectEl.value = state.templeKey;
                            break;
                        }
                    }
                }
            }
            if (typeof updateParkingView === 'function') updateParkingView();
        }

        // Update Sidebar Active States
        document.querySelectorAll('.nav-item').forEach(item => {
            const onClickAttr = item.getAttribute('onclick') || '';
            if (onClickAttr.includes(`'${viewId}'`)) {
                item.classList.add('bg-[#FFF3E0]', 'text-[#E65100]', 'font-semibold');
                item.classList.remove('text-slate-500');
            } else {
                item.classList.remove('bg-[#FFF3E0]', 'text-[#E65100]', 'font-semibold');
                item.classList.add('text-slate-500');
            }
        });

        // Update Mobile Bottom Nav Active States
        document.querySelectorAll('.dd-bnav-btn').forEach(btn => {
            const onClickAttr = btn.getAttribute('onclick') || '';
            if (onClickAttr.includes(`'${viewId}'`)) {
                btn.classList.add('dd-bnav-active');
            } else {
                btn.classList.remove('dd-bnav-active');
            }
        });

        // Update Sidebar Styling
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('bg-[#FFF3E0]', 'text-[#E65100]', 'font-semibold');
            nav.classList.add('text-slate-500', 'hover:bg-primary-container', 'hover:text-primary');
        });

        const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(n => n.getAttribute('onclick') && n.getAttribute('onclick').includes(viewId));
        if (activeNav) {
            activeNav.classList.remove('text-slate-500', 'hover:bg-primary-container', 'hover:text-primary');
            activeNav.classList.add('bg-[#FFF3E0]', 'text-[#E65100]', 'font-semibold');
        }

        if (scrollTargetId) {
            const el = document.getElementById(scrollTargetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (typeof syncWithAdminData === 'function') syncWithAdminData();
    } else {
        // View does not exist locally! Perform smart cross-page redirect!
        const pageMap = {
            'view-live-status': 'index.html',
            'view-famous-temples': 'index.html?view=famous-temples',
            'view-tickets': 'tickets.html',
            'view-parking': 'parking.html',
            'view-news': 'news.html',
            'view-emergency': 'emergency.html'
        };
        
        const targetPage = pageMap[viewId];
        if (targetPage) {
            window.location.href = targetPage;
        }
    }
}

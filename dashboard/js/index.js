// ===== Divya Darshan Index/Home Page Module =====
        }

        function closeTempleDetails() {
            const modal = document.getElementById('temple-detail-modal');
            const content = document.getElementById('temple-modal-content');

            modal.classList.add('opacity-0');
            content.classList.add('scale-95');

            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 500);
        }

        // ================= LIVE STATUS MODAL LOGIC =================
        function openLiveDetails(el) {
            const modal = document.getElementById('live-detail-modal');
            const content = document.getElementById('live-modal-content');

            // 1. Extract info from clicked card
            const imgElement = el.querySelector('img');
            const titleEl = el.querySelector('h3.font-manrope') || el.querySelector('h3.font-bold') || el.querySelector('p.font-bold');
            let title = titleEl ? titleEl.innerText : 'Sacred Temple';

            // Extract crowd level
            let crowdLevel = 'Medium';
            let crowdColor = 'orange';
            let crowdValue = 50;
            const badgeEl = Array.from(el.querySelectorAll('span')).find(s => s.innerText.includes('Low') || s.innerText.includes('Medium') || s.innerText.includes('High'));
            if (badgeEl) {
                if (badgeEl.innerText.includes('Low')) { crowdLevel = 'Low'; crowdColor = 'green'; crowdValue = 20; }
                else if (badgeEl.innerText.includes('High')) { crowdLevel = 'High'; crowdColor = 'red'; crowdValue = 90; }
            }

            // Extract wait time
            let waitTime = '30 Mins';
            const waitEl = Array.from(el.querySelectorAll('p')).find(p => p.innerText.includes('Mins') || p.innerText.includes('Hrs'));
            if (waitEl) {
                waitTime = waitEl.innerText.replace('~', '').trim();
            }

            // Determine loc
            let loc = 'Sacred Location';
            if (title.includes('Venkateswara')) loc = 'Tirupati, AP';
            else if (title.includes('Krishna')) loc = 'Udupi, KA';
            else if (title.includes('Manjunatha')) loc = 'Dharmasthala, KA';
            else if (title.includes('Kedarnath')) loc = 'Uttarakhand';
            else if (title.includes('Vishwanath')) loc = 'Varanasi, UP';
            else if (title.includes('Somnath')) loc = 'Gujarat';
            else if (title.includes('Jagannath')) loc = 'Puri, Odisha';

            // 2. Populate Header
            document.getElementById('live-modal-img').src = imgElement.src;
            document.getElementById('live-modal-title').innerText = title;
            document.getElementById('live-modal-loc').innerText = loc;

            const badgeMap = {
                'Low': `<span class="material-symbols-outlined text-[14px] mt-[1px]">groups</span> Low Crowd`,
                'Medium': `<span class="material-symbols-outlined text-[14px] mt-[1px]">groups</span> Medium Crowd`,
                'High': `<span class="material-symbols-outlined text-[14px] mt-[1px]">warning</span> High Crowd`
            };
            const badgeColors = {
                'Low': 'bg-green-500',
                'Medium': 'bg-orange-500',
                'High': 'bg-red-600'
            };
            const badge = document.getElementById('live-modal-crowd-badge');
            badge.innerHTML = badgeMap[crowdLevel];
            badge.className = `px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg uppercase tracking-wider flex items-center justify-center gap-1 ${badgeColors[crowdLevel]}`;

            // 3. Populate Live Summary
            document.getElementById('live-modal-wait').innerText = waitTime;
            document.getElementById('live-entry-speed').innerText = crowdLevel === 'Low' ? '140' : (crowdLevel === 'Medium' ? '85' : '40');

            const pb = document.getElementById('live-progress-bar');
            pb.className = `h-full bg-${crowdColor}-500 transition-all duration-1000`;
            pb.style.width = '0%';
            setTimeout(() => { pb.style.width = crowdValue + '%'; }, 300);

            const sugg = document.getElementById('live-suggestion-text');
            if (crowdLevel === 'Low') {
                sugg.innerHTML = `<span class="material-symbols-outlined text-[14px]">check_circle</span> Perfect time to visit. Minimal waiting.`;
                sugg.className = 'text-xs font-semibold text-green-700 mt-3 flex items-center gap-1';
            } else if (crowdLevel === 'Medium') {
                sugg.innerHTML = `<span class="material-symbols-outlined text-[14px]">info</span> Steady movement. Plan for slight delays.`;
                sugg.className = 'text-xs font-semibold text-orange-700 mt-3 flex items-center gap-1';
            } else {
                sugg.innerHTML = `<span class="material-symbols-outlined text-[14px]">warning</span> Heavy rush. Better to visit after 2 PM.`;
                sugg.className = 'text-xs font-semibold text-red-700 mt-3 flex items-center gap-1';
            }

            // 4. Fill Trends
            document.getElementById('trend-bar-m').style.height = crowdLevel === 'High' ? '80%' : '40%';
            document.getElementById('trend-bar-a').style.height = crowdLevel === 'Medium' ? '70%' : '50%';
            document.getElementById('trend-bar-e').style.height = crowdLevel === 'Low' ? '30%' : (crowdLevel === 'High' ? '90%' : '60%');

            // 5. Intelligent Layout Map Fill
            document.getElementById('live-layout-name').innerText = title.split(' ')[0] + ' Sanctum';
            let gate1 = 'North Gate', gate2 = 'South Gate', park = 'P1 (0.2km)';
            if (title.includes('Venkateswara')) { gate1 = 'Vaikuntam Q1'; gate2 = 'Main Exit'; park = 'Rambagha (0.8km)'; }
            if (title.includes('Manjunatha')) { gate1 = 'River Gate'; gate2 = 'East Exit'; park = 'Bahubali (1.2km)'; }
            if (title.includes('Somnath')) { gate1 = 'Sea Facing Gate'; park = 'Beach Side (0.5km)'; }
            document.getElementById('live-layout-entry').innerText = gate1;
            document.getElementById('live-layout-exit').innerText = gate2;
            document.getElementById('live-layout-parking').innerText = park;

            // 6. Slots Payload
            const slots = document.getElementById('live-slots-container');
            const tNow = new Date();
            let slotHtml = '';
            const startH = (tNow.getHours() < 12) ? 12 : (tNow.getHours() > 18 ? 8 : tNow.getHours() + 1);
            slotHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-lg border border-primary/10 shadow-sm">
                    <span class="text-xs font-bold text-slate-700">${startH}:00 - ${startH + 2}:00</span>
                    <span class="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">OPEN</span>
                </div>`;
            slotHtml += `<div class="flex justify-between items-center bg-white p-3 rounded-lg border border-primary/10 shadow-sm opacity-60">
                    <span class="text-xs font-bold text-slate-700">${startH + 2}:00 - ${startH + 4}:00</span>
                    <span class="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">FULL</span>
                </div>`;
            slots.innerHTML = slotHtml;

            // 7. Smart AI Suggestions
            let bestEntry = `Use ${gate1} for 20% faster moving queue.`;
            let peakAvoid = crowdLevel === 'High' ? `Avoid next 2 hours. Multiple bus arrivals registered.` : `Good to visit now. Queue moving smoothly.`;
            document.getElementById('live-insights-container').innerHTML = `
        <li class="flex gap-3 items-start">
            <div class="bg-blue-50 text-blue-600 p-1.5 rounded text-[14px]"><span class="material-symbols-outlined text-[16px] mt-0.5">login</span></div>
            <div><p class="text-xs font-bold text-slate-700">Best Entry</p><p class="text-[10px] text-slate-500 mt-0.5">${bestEntry}</p></div>
        </li>
        <li class="flex gap-3 items-start">
            <div class="bg-orange-50 text-orange-600 p-1.5 rounded text-[14px]"><span class="material-symbols-outlined text-[16px] mt-0.5">schedule</span></div>
            <div><p class="text-xs font-bold text-slate-700">Peak Avoidance</p><p class="text-[10px] text-slate-500 mt-0.5">${peakAvoid}</p></div>
        </li>
    `;

            // 8. Alerts
            if (crowdLevel === 'High') {
                document.getElementById('live-alert-text').innerText = 'Heavy rush reported. Main queue complex is currently holding devotees.';
            } else {
                document.getElementById('live-alert-text').innerText = 'No major alerts. Regular darshan protocols in effect.';
            }

            // Set globally for book action
            let tKey = 'tirupati';
            if (loc.toLowerCase().includes('dharmasthala')) tKey = 'manjunatha';
            if (loc.toLowerCase().includes('udupi')) tKey = 'krishna';
            if (title.toLowerCase().includes('kukke')) tKey = 'kukke';
            if (title.toLowerCase().includes('kashi')) tKey = 'kashi';
            if (title.toLowerCase().includes('somnath')) tKey = 'somnath';
            if (title.toLowerCase().includes('jagannath')) tKey = 'jagannath';
            if (title.toLowerCase().includes('kedarnath')) tKey = 'kedarnath';
            window._liveModalTempleKey = tKey;

            // Show modal with animation
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            }, 10);
        }

        function closeLiveDetails() {
            const modal = document.getElementById('live-detail-modal');
            const content = document.getElementById('live-modal-content');
            modal.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }

        function bookFromLiveModal() {
            closeLiveDetails();
            showView('view-tickets');
            setTimeout(() => {
                const templeSelect = document.getElementById('ticket-temple-select');
                if (templeSelect && window._liveModalTempleKey) {
                    templeSelect.value = window._liveModalTempleKey;
                    templeSelect.dispatchEvent(new Event('change'));
                }
            }, 350);
        }

        // ─── Travel Planner Modal ───────────────────────────────────────────────
        function openTravelPlanner() {
            const modal = document.getElementById('travel-planner-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Prevent body scroll while modal is open
            document.body.style.overflow = 'hidden';
        }

        function closeTravelPlanner() {
            const modal = document.getElementById('travel-planner-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }

        function closePlannerIfBg(event) {
            // Only close if the click was directly on the backdrop, not a child
            if (event.target === event.currentTarget) {
                closeTravelPlanner();
            }
        }

        // UI Tab Router
        function syncWithAdminData() {
            // Determine active temple context
            let templeKey = 'tirupati';
            const weatherSelect = document.getElementById('weather-temple-select');
            const parkSelect = document.getElementById('parking-temple-select');
            const ticketSelect = document.getElementById('ticket-temple-select');
            const parkingEl = document.getElementById('view-parking');
            const ticketEl = document.getElementById('view-tickets');

            if (parkingEl && !parkingEl.classList.contains('hidden') && parkSelect?.value) {
                templeKey = parkSelect.value;
            } else if (ticketEl && !ticketEl.classList.contains('hidden') && ticketSelect?.value) {
                templeKey = ticketSelect.value;
            } else if (weatherSelect?.value) {
                templeKey = weatherSelect.value;
            }

            if (!templeKey) return;

            // Sync Parking sidebar widget from localStorage
            const parkingDataRaw = localStorage.getItem('dd_parkingData');
            if (parkingDataRaw) {
                try {
                    const parkingData = JSON.parse(parkingDataRaw);
                    if (parkingData && parkingData[templeKey]) {
                        const zones = parkingData[templeKey].zones;
                        const sidebarContainer = document.getElementById('user-parking-zones');
                        if (sidebarContainer && zones) {
                            sidebarContainer.innerHTML = zones.map(z => {
                                const available = Math.max(0, z.capacity - z.filled);
                                const pct = Math.round((z.filled / z.capacity) * 100);
                                const color = pct > 90 ? 'text-red-600' : pct > 70 ? 'text-orange-600' : 'text-green-600';
                                return `
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-2">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[10px] font-bold text-slate-700">${z.name}</span>
                                    <span class="text-[10px] font-black ${color} uppercase">${available === 0 ? 'FULL' : available + ' free'}</span>
                                </div>
                                <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                    <div class="h-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-orange-500' : 'bg-green-500'} transition-all" style="width: ${pct}%"></div>
                                </div>
                            </div>
                        `;
                            }).join('');
                        }

                        // If on parking view, also update the main cards
                        if (parkingEl && !parkingEl.classList.contains('hidden')) {
                            updateParkingView();
                        }
                    }
                } catch (e) { console.error('Sync failed', e); }
            }
        }

        // ==================== FEEDBACK SYSTEM ====================
        let selectedRating = 0;
        const ratingLabels = ['', 'Poor Experience', 'Below Average', 'Good Experience', 'Very Satisfied', 'Absolutely Blessed! 🙏'];

        function hoverRating(val) {
            document.querySelectorAll('.star-btn').forEach((s, i) => {
                const icon = s.querySelector('.material-symbols-outlined');
                if (i < val) {
                    s.style.color = '#f59e0b'; // amber-400
                    icon.setAttribute('style', 'font-size:48px; font-variation-settings: "FILL" 1;');
                    s.style.transform = 'scale(1.2)';
                } else {
                    s.style.color = '#e2e8f0'; // slate-200
                    icon.setAttribute('style', 'font-size:48px;');
                    s.style.transform = 'scale(1)';
                }
            });
            const label = document.getElementById('rating-label');
            if (label) {
                label.textContent = ratingLabels[val];
                const colorMap = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#059669' };
                label.style.color = colorMap[val] || '#94a3b8';
            }
        }

        function resetHover() {
            hoverRating(selectedRating);
            if (!selectedRating) {
                const label = document.getElementById('rating-label');
                if (label) { label.textContent = 'Select your rating'; label.style.color = '#94a3b8'; }
            }
        }

        function setRating(val) {
            selectedRating = val;
            hoverRating(val);
            document.querySelectorAll('.star-btn').forEach((s, i) => {
                if (i < val) {
                    s.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1.2)' }], { duration: 200, easing: 'ease-out' });
                }
            });
        }

        function updateCharCount(el) {
            const count = el.value.length;
            const counter = document.getElementById('char-count');
            if (!counter) return;
            counter.textContent = count + ' / 400';
            counter.style.color = count > 350 ? '#ef4444' : count > 200 ? '#f97316' : '#94a3b8';
        }

        function submitFeedback(e) {
            e.preventDefault();
            const name = (document.getElementById('feedback-name')?.value.trim()) || 'Pilgrim';
            const thoughts = document.getElementById('feedback-text')?.value.trim();
            const rating = selectedRating || 5;
            const stars = Array.from({ length: 5 }, (_, i) => i < rating
                ? '<span class="material-symbols-outlined text-yellow-400 text-[22px]" style="font-variation-settings: \'FILL\' 1;">star</span>'
                : '<span class="material-symbols-outlined text-slate-200 text-[22px]">star</span>'
            ).join('');

            const form = document.getElementById('feedback-form');

            // SAVE TO LOCALSTORAGE
            const currentTemple = document.getElementById('weather-temple-select')?.value || 'tirupati';
            const feedbackObj = {
                id: 'FB-' + Date.now(),
                name: name,
                thoughts: thoughts,
                rating: rating,
                templeKey: currentTemple,
                time: new Date().toISOString()
            };

            const allFeed = JSON.parse(localStorage.getItem('dd_feedback') || '[]');
            allFeed.unshift(feedbackObj);
            localStorage.setItem('dd_feedback', JSON.stringify(allFeed.slice(0, 100)));

            // PUSH NOTIFICATION TO ADMIN
            const notes = JSON.parse(localStorage.getItem('globalNotifications') || '[]');
            notes.unshift({
                type: 'feedback',
                msg: `Feedback: ${name} rated ${rating}★ for ${currentTemple === 'manjunatha' ? 'Dharmasthala' : 'Tirupati'}`,
                time: new Date().toLocaleTimeString(),
                targetContext: currentTemple
            });
            localStorage.setItem('globalNotifications', JSON.stringify(notes.slice(0, 30)));


        function updateWeatherView() {
            const temple = document.getElementById('weather-temple-select').value;
            const data = weatherDataStore[temple] || weatherDataStore["tirupati"];

            document.getElementById('weather-temp').innerText = data.temp;
            document.getElementById('weather-desc').innerText = data.desc;
            document.getElementById('weather-hint').innerText = data.hint;
            document.getElementById('weather-icon').innerText = data.icon;
        }

        function registeredTempleFacilityIcons(facilities) {
            const iconMap = {
                parking: 'local_parking',
                wheelchair: 'accessible',
                annadanam: 'restaurant',
                accommodation: 'hotel',
                ev_charging: 'ev_station',
                medical: 'medical_services',
                atm: 'atm',
                drinking_water: 'water_drop',
                restrooms: 'wc'
            };
            return Object.entries(facilities || {})
                .filter(([, value]) => Boolean(value))
                .slice(0, 4)
                .map(([key]) => iconMap[key] || 'check_circle');
        }

        const DEFAULT_TEMPLE_LOGOS = {
            'iskcon-temple-bengaluru': '../assets/news/iskcon-bangalore-logo-n.png',
            'kashi-vishwanath-full-demo': '../assets/news/Kashi-Vishwanath-Temple.webp',
            'virupaksha-hampi': '../assets/news/virupaksha-temple-in-hampi.webp',
            'virupaksha-temple-hampi': '../assets/news/virupaksha-temple-in-hampi.webp'
        };

        const DEFAULT_TEMPLE_IMAGE = '../assets/news/Kashi-Vishwanath-Temple.webp';

        function getDefaultTempleLogo(slug) {
            return DEFAULT_TEMPLE_LOGOS[slug] || DEFAULT_TEMPLE_IMAGE;
        }

        function normalizeTemples(temples) {
            if (!Array.isArray(temples)) return [];
            const seen = new Set();
            return temples.filter((temple) => {
                const key = temple?.slug || `${temple?.temple_name}|${temple?.city}|${temple?.state}`;
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        function prioritizeDemoTemple(temples) {
            if (!Array.isArray(temples)) return [];
            return [...temples].sort((a, b) => {
                if (a?.slug === 'iskcon-temple-bengaluru') return -1;
                if (b?.slug === 'iskcon-temple-bengaluru') return 1;
                return 0;
            });
        }

        // HERO TAB PORTAL & SANCTUARIES FINDER
        let allRegisteredTemples = [];

        function setHeroTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            const contentEl = document.getElementById('hcontent-' + tab);
            if (contentEl) contentEl.classList.remove('hidden');
            
            document.querySelectorAll('[id^="htab-"]').forEach(btn => {
                btn.className = "flex-1 py-2.5 rounded-xl text-xs font-semibold text-center text-white/80 hover:text-white transition-all";
            });
            const activeBtn = document.getElementById('htab-' + tab);
            if (activeBtn) {
                activeBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold text-center bg-white text-slate-900 transition-all shadow-sm";
            }
        }

        function triggerHeroPlanner() {
            const templeKey = document.getElementById('hselect-planner-temple').value;
            const date = document.getElementById('hselect-planner-date').value || new Date().toISOString().split('T')[0];
            const devotees = Number(document.getElementById('hselect-planner-devotees').value || 2);
            
            const templeMap = {
                tirupati: 'Tirumala Tirupati',
                manjunatha: 'Dharmasthala Manjunatha',
                krishna: 'Udupi Sri Krishna',
                kukke: 'Kukke Subramanya'
            };
            
            const formState = {
                temple: templeMap[templeKey] || 'Dharmasthala Manjunatha',
                date: date,
                pilgrims: devotees,
                budget: 'Mid-range',
                travelMode: 'Car',
                timePreference: 'Morning',
                nights: 1,
                startLocation: '',
                useLiveLocation: false,
                extraStops: '',
                foodPreference: 'Vegetarian',
                elderlyFriendly: true,
                wheelchairAccessible: false,
                childFriendly: true,
                vipDarshan: false,
                crowdPreference: 'Least crowded',
                weatherAware: true,
                festivalAware: true
            };
            
            localStorage.setItem('dd.planner.form.v1', JSON.stringify(formState));
            window.location.href = 'http://127.0.0.1:5173/';
        }

        function triggerHeroTickets() {
            const templeKey = document.getElementById('hselect-tickets-temple').value;
            const selectEl = document.getElementById('ticket-temple-select');
            if (selectEl) {
                selectEl.value = templeKey;
                selectEl.dispatchEvent(new Event('change'));
            }
            showView('view-tickets');
            ddBNavSet(1);
        }

        function triggerHeroCrowd() {
            const templeKey = document.getElementById('hselect-crowd-temple').value;
            const selectEl = document.getElementById('weather-temple-select');
            if (selectEl) {
                selectEl.value = templeKey;
                selectEl.dispatchEvent(new Event('change'));
            }
            const parkingSelect = document.getElementById('parking-temple-select');
            if (parkingSelect) {
                parkingSelect.value = templeKey;
                parkingSelect.dispatchEvent(new Event('change'));
            }
            showView('view-live-status');
            ddBNavSet(0);
            document.getElementById('live-status').scrollIntoView({ behavior: 'smooth' });
        }

        function renderFamousTemplesFromRegistered(temples) {
            allRegisteredTemples = temples;
            filterTempleHub();
        }

        function filterTempleHub() {
            const grid = document.getElementById('famous-temples-grid');
            if (!grid) return;

            const searchQuery = (document.getElementById('temple-hub-search')?.value || '').toLowerCase();
            const stateFilter = document.getElementById('temple-hub-filter-state')?.value || '';
            const deityFilter = document.getElementById('temple-hub-filter-deity')?.value || '';
            const crowdFilter = document.getElementById('temple-hub-filter-crowd')?.value || '';

            const filtered = allRegisteredTemples.filter(temple => {
                const name = (temple.temple_name || '').toLowerCase();
                const deity = (temple.deity_name || '').toLowerCase();
                const city = (temple.city || '').toLowerCase();
                const state = (temple.state || '').toLowerCase();
                const matchSearch = !searchQuery || 
                    name.includes(searchQuery) || 
                    deity.includes(searchQuery) || 
                    city.includes(searchQuery) || 
                    state.includes(searchQuery);

                const matchState = !stateFilter || (temple.state || '') === stateFilter;
                const matchDeity = !deityFilter || (temple.deity_name || '') === deityFilter;
                
                let crowdLevel = 'Low';
                if (temple.slug === 'iskcon-temple-bengaluru') crowdLevel = 'Medium';
                else if (temple.slug === 'kashi-vishwanath-full-demo') crowdLevel = 'High';
                else if (temple.slug === 'virupaksha-hampi') crowdLevel = 'Low';
                const matchCrowd = !crowdFilter || crowdLevel === crowdFilter;

                return matchSearch && matchState && matchDeity && matchCrowd;
            });

            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full bg-white rounded-[28px] p-8 shadow-[0px_12px_32px_rgba(26,35,126,0.06)] text-center w-full">
                        <span class="material-symbols-outlined text-slate-300 text-5xl mb-3">search_off</span>
                        <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">No sanctuaries match your filters</p>
                        <p class="text-slate-400 text-xs mt-2">Try clearing your filters or search query.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtered.map((temple, idx) => {
                const accent = temple.primary_color || '#ea580c';
                const logo = temple.logo_url || getDefaultTempleLogo(temple.slug);
                const image = temple.hero_image_url || getDefaultTempleImage(temple.slug);
                const rawLocation = [temple.city, temple.state].filter(Boolean).join(', ') || 'India';
                
                let badgeText = 'Partner Temple';
                let badgeBg = 'bg-primary/90';
                let crowdText = 'Low';
                let crowdColor = 'text-emerald-600 bg-emerald-50';
                
                if (temple.slug === 'iskcon-temple-bengaluru') {
                    badgeText = 'Featured · Live';
                    badgeBg = 'bg-emerald-600/90';
                    crowdText = 'Medium';
                    crowdColor = 'text-amber-600 bg-amber-50';
                } else if (temple.slug === 'kashi-vishwanath-full-demo') {
                    badgeText = 'Live Crowd';
                    badgeBg = 'bg-[#E65100]/90';
                    crowdText = 'High';
                    crowdColor = 'text-rose-600 bg-rose-50';
                } else if (temple.slug === 'virupaksha-hampi') {
                    badgeText = 'Online Darshan';
                    badgeBg = 'bg-blue-600/90';
                    crowdText = 'Low';
                    crowdColor = 'text-emerald-600 bg-emerald-50';
                }
                
                return `
                    <div class="rounded-[28px] overflow-hidden shadow-lg border border-slate-100 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer" onclick="openTempleDetails(this)" data-slug="${temple.slug}">
                        <div class="h-56 overflow-hidden relative">
                            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${image}" alt="${temple.temple_name}" loading="lazy" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            <span class="absolute top-4 left-4 ${badgeBg} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md z-10">${badgeText}</span>
                        </div>
                        <div class="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-0.5 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        <img src="${logo}" alt="logo" class="w-full h-full object-cover rounded-lg" onerror="this.src='/assets/news/unnamed.jpg'" />
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="font-manrope font-bold text-base text-slate-800 truncate leading-tight group-hover:text-primary transition-colors">${temple.temple_name || 'Sanctuary'}</h3>
                                        <p class="text-xs text-slate-400 font-medium truncate">${temple.deity_name || 'Sacred Deity'}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-slate-500 mt-3 line-clamp-2">${temple.tagline || 'Experience real-time AI wait tracking and queue booking.'}</p>
                            </div>
                            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span class="text-xs font-semibold text-slate-400 flex items-center"><span class="material-symbols-outlined text-sm mr-1">location_on</span>${rawLocation}</span>
                                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${crowdColor}">Crowd: ${crowdText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            setupTempleLinkPrefetch();
            
            if (typeof initializeScrollReveals === 'function') initializeScrollReveals();
            if (typeof initializeLazyImageObserver === 'function') initializeLazyImageObserver();
        }

        function resetTempleHubFilters() {
            const search = document.getElementById('temple-hub-search');
            if (search) search.value = '';
            const state = document.getElementById('temple-hub-filter-state');
            if (state) state.value = '';
            const deity = document.getElementById('temple-hub-filter-deity');
            if (deity) deity.value = '';
            const crowd = document.getElementById('temple-hub-filter-crowd');
            if (crowd) crowd.value = '';
            filterTempleHub();
        }

        function mergeRegisteredTemplesIntoSearch(temples) {
            if (!Array.isArray(temples)) return;
            const existing = new Set(ddTempleList.map((item) => `${item.name}|${item.loc}`));
            temples.forEach((temple) => {
                const name = temple.temple_name || 'Temple';
                const loc = [temple.city, temple.state].filter(Boolean).join(', ') || 'India';
                const key = `${name}|${loc}`;
                if (existing.has(key)) return;
                existing.add(key);
                ddTempleList.unshift({
                    name,
                    loc,
                    deity: temple.deity_name || temple.religion || 'Temple deity'
                });
            });
        }

        function renderRegisteredTemples(temples) {
            const grid = document.getElementById('registered-temples-grid');
            if (!grid) return;

            // Remove duplicates by slug
            const seenSlugs = new Set();
            const uniqueTemples = temples.filter(temple => {
                if (!temple.slug || seenSlugs.has(temple.slug)) return false;
                seenSlugs.add(temple.slug);
                return true;
            });

            const displayTemples = prioritizeDemoTemple(uniqueTemples);

            if (!Array.isArray(displayTemples) || displayTemples.length === 0) {
                grid.innerHTML = `
            <div class="col-span-full bg-white rounded-[28px] p-8 shadow-[0px_12px_32px_rgba(26,35,126,0.06)] text-center">
                <p class="text-sm font-bold uppercase tracking-[0.22em] text-primary">Partner temples will appear here</p>
                <p class="text-slate-500 mt-3">The first registered temple will show up automatically once registration is complete.</p>
            </div>
        `;
                setupTempleLinkPrefetch();
                return;
            }

            grid.innerHTML = displayTemples.map((temple) => {
                const accent = temple.primary_color || '#4c56af';
                const location = [temple.city, temple.state].filter(Boolean).join(', ') || 'India';
                const icons = registeredTempleFacilityIcons(temple.facilities);
                const logo = temple.logo_url || '/assets/news/unnamed.jpg';
                return `
            <article class="bg-white rounded-[24px] overflow-hidden shadow-[0px_8px_24px_rgba(26,35,126,0.08)] hover:shadow-[0px_12px_32px_rgba(26,35,126,0.12)] transition-all duration-300 flex flex-col">
                <div class="h-2" style="background:${accent};"></div>
                <div class="p-5 flex-1 flex flex-col">
                    <div class="flex items-start gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-xl flex-shrink-0">
                                <img src="${logo}" alt="${temple.temple_name}" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/news/unnamed.jpg'" />
                            </div>
                            <div class="min-w-0">
                                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style="background:${accent}18;color:${accent};">Partner</span>
                                <h3 class="font-manrope font-bold text-lg mt-1 leading-tight truncate">${temple.temple_name || 'Temple'}</h3>
                                <p class="text-xs text-slate-500 truncate">${temple.deity_name || 'Temple deity'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 rounded-[16px] bg-slate-50 p-3">
                        <p class="text-xs font-semibold text-slate-700">${location}</p>
                        <p class="text-xs text-slate-500 mt-1 line-clamp-2">${temple.tagline || 'Temple microsite with darshan booking, prasadam, donation, and travel planning.'}</p>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-1.5">
                        ${icons.length ? icons.map((icon) => `
                            <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">${icon}</span>
                            </span>
                        `).join('') : `<span class="text-xs text-slate-400">Facilities updated soon</span>`}
                    </div>
                    <a href="/temple/${temple.slug}" class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style="background:${accent};">
                        Visit Microsite
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                </div>
            </article>
        `;
            }).join('');
            setupTempleLinkPrefetch();
        }

        function loadCachedRegisteredTemples() {
            try {
                const payload = localStorage.getItem('dd-registered-temples');
                if (!payload) return null;
                return normalizeTemples(JSON.parse(payload));
            } catch (error) {
                return null;
            }
        }

        function cacheRegisteredTemples(temples) {
            try {
                localStorage.setItem('dd-registered-temples', JSON.stringify(temples));
            } catch (error) {
                // ignore localStorage failures
            }
        }

        function scheduleNonCriticalTask(fn) {
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(fn, { timeout: 1000 });
            } else {
                setTimeout(fn, 200);
            }
        }

        function populateDynamicDropdowns(temples) {
            if (!Array.isArray(temples) || temples.length === 0) return;
            
            const selectIds = [
                'parking-temple-select',
                'ticket-temple-select',
                'weather-temple-select',
                'booking-temple',
                'hselect-planner-temple',
                'hselect-crowd-temple'
            ];

            selectIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                
                const prevValue = el.value;
                const existingValues = new Set(Array.from(el.options).map(opt => opt.value));
                
                temples.forEach(t => {
                    if (!existingValues.has(t.slug)) {
                        const option = document.createElement('option');
                        option.value = t.slug;
                        if (id === 'parking-temple-select') {
                            option.textContent = `🕌 ${t.temple_name || t.name} (${t.city || 'India'}, ${t.state || ''}) [Live Partner]`;
                        } else {
                            option.textContent = t.temple_name || t.name;
                        }
                        el.appendChild(option);
                        existingValues.add(t.slug);
                    }
                });
                
                if (prevValue && Array.from(el.options).some(opt => opt.value === prevValue)) {
                    el.value = prevValue;
                }
            });
        }

        function syncParkingDataFromRegistered(temples) {
            let localParking;
            try {
                const raw = localStorage.getItem('dd_parkingData');
                localParking = raw ? JSON.parse(raw) : {};
            } catch (e) {
                localParking = {};
            }

            temples.forEach(t => {
                const key = t.slug;
                if (t.parking_layout && t.parking_layout.zones) {
                    localParking[key] = {
                        name: t.temple_name || t.name,
                        zones: t.parking_layout.zones
                    };
                } else if (!localParking[key]) {
                    localParking[key] = {
                        name: t.temple_name || t.name,
                        zones: [
                            {
                                id: 'zone-1',
                                name: "Main Entrance Lot",
                                capacity: 24,
                                filled: 8,
                                rows: ['A', 'B', 'C', 'D'],
                                cols: 6,
                                slots: Array.from({ length: 24 }, (_, i) => {
                                    const rowChar = String.fromCharCode(65 + Math.floor(i / 6));
                                    const colNum = (i % 6) + 1;
                                    return {
                                        id: `${rowChar}${colNum}`,
                                        row: rowChar,
                                        col: colNum,
                                        status: Math.random() > 0.4 ? 'available' : 'occupied',
                                        type: Math.random() > 0.85 ? 'ev' : 'car',
                                        label: `Spot ${rowChar}-${colNum}`
                                    };
                                })
                            }
                        ]
                    };
                }
            });

            localStorage.setItem('dd_parkingData', JSON.stringify(localParking));
        }

        async function loadRegisteredTemples() {
            const cachedTemples = loadCachedRegisteredTemples();
            if (cachedTemples && cachedTemples.length) {
                renderRegisteredTemples(cachedTemples);
                renderFamousTemplesFromRegistered(cachedTemples);
                mergeRegisteredTemplesIntoSearch(cachedTemples);
                populateDynamicDropdowns(cachedTemples);
                syncParkingDataFromRegistered(cachedTemples);
                updateParkingView();
            }

            try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 4000); // 4s timeout — fail fast if Supabase is unreachable
                const res = await fetch('/api/temples', { cache: 'no-cache', signal: controller.signal });
                clearTimeout(tid);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Unable to load registered temples');
                const temples = normalizeTemples(data.temples || []);
                cacheRegisteredTemples(temples);
                renderRegisteredTemples(temples);
                renderFamousTemplesFromRegistered(temples);
                mergeRegisteredTemplesIntoSearch(temples);
                populateDynamicDropdowns(temples);
                syncParkingDataFromRegistered(temples);
                updateParkingView();
            } catch (error) {
                if (!cachedTemples || cachedTemples.length === 0) {
                    const grid = document.getElementById('registered-temples-grid');
                    if (grid) {
                        grid.innerHTML = `
                    <div class="col-span-full bg-white rounded-[28px] p-8 shadow-[0px_12px_32px_rgba(26,35,126,0.06)] text-center">
                        <p class="text-sm font-bold uppercase tracking-[0.22em] text-rose-500">Registered temple feed unavailable</p>
                        <p class="text-slate-500 mt-3">${error.message}</p>
                    </div>
                `;
                    }
                }
            }
        }

        const templePrefetchCache = new Set();
        let templePrefetchInitialized = false;
        function prefetchTemplePage(href) {
            if (!href || templePrefetchCache.has(href)) return;
            try {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = href;
                link.as = 'document';
                document.head.appendChild(link);
                templePrefetchCache.add(href);
            } catch (err) {
                // ignore prefetch failures
            }
        }

        function setupTempleLinkPrefetch() {
            const linkSelector = '#registered-temples-grid a, #famous-temples-grid a, a[href^="/temple/"]';

        // Start live clock
        setInterval(() => {
            const el = document.getElementById('weather-time');
            if (el) {
                el.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
            }
        }, 1000);

        function scheduleNonCriticalTask(fn) {
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(fn, { timeout: 1000 });
            } else {
                setTimeout(fn, 200);
            }
        }
        // ==========================================
        // HERO INTERACTION & BACKEND SYNC HANDLERS
        // ==========================================
        async function handleHeroBookNow() {
            const btn = document.getElementById('hero-book-btn');
            if (!btn) return;
            
            // Add a beautiful, responsive visual feedback state
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">sync</span> <span>Syncing Sanctuary DB...</span>`;
            btn.style.opacity = '0.85';
            
            try {
                // Ping the backend to fetch the active tickets/slots
                const response = await fetch('/api/admin/booking-control');
                if (response.ok) {
                    setTimeout(() => {
                        showView('view-tickets');
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                        btn.style.opacity = '1';
                        
                        // Scroll nicely and focus the first field
                        setTimeout(() => {
                            const selectEl = document.getElementById('ticket-temple-select');
                            if (selectEl) {
                                selectEl.focus();
                                selectEl.classList.add('ring-4', 'ring-orange-500/20');
                                setTimeout(() => selectEl.classList.remove('ring-4', 'ring-orange-500/20'), 1500);
                            }
                        }, 350);
                    }, 400);
                } else {
                    throw new Error('Fallback to static transition');
                }
            } catch (e) {
                setTimeout(() => {
                    showView('view-tickets');
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                    btn.style.opacity = '1';
                }, 300);
            }
        }

        async function handleHeroCheckLiveStatus() {
            const btn = document.getElementById('hero-status-btn');
            if (!btn) return;
            
            // Scaled animation on click
            btn.style.transform = 'scale(0.96)';
            setTimeout(() => btn.style.transform = '', 150);
            
            // Scroll to live crowd status section with smooth overlay overlay animation
            const target = document.getElementById('live-status');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Refresh cards with a gorgeous shimmering highlight
            const cards = document.querySelectorAll('#live-status .grid > div');
            cards.forEach(card => {
                card.classList.add('refreshing-card');
                let badge = card.querySelector('.live-refresh-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'live-refresh-badge absolute top-4 left-4 bg-orange-600/95 text-white text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider z-10 backdrop-blur-sm animate-pulse';
                    badge.innerText = 'Syncing...';
                    card.style.position = 'relative';
                    card.appendChild(badge);
                }
            });
            
            try {
                // Perform a live fetch of registered temples from the server!
                const res = await fetch('/api/temples');
                if (res.ok) {
                    const temples = await res.json();
                    if (typeof renderFamousTemplesFromRegistered === 'function') {
                        renderFamousTemplesFromRegistered(temples);
                    }
                }
            } catch (e) {
                console.warn('Live refresh sync bypassed.', e);
            } finally {
                setTimeout(() => {
                    const cards = document.querySelectorAll('#live-status .grid > div');
                    cards.forEach(card => {
                        card.classList.remove('refreshing-card');
                        const badge = card.querySelector('.live-refresh-badge');
                        if (badge) badge.remove();
                    });
                }, 1300);
            }
        }

        // Majestic Cinematic Static Scroll Overlay Effect & Autohide Header
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const heroBg = document.getElementById('hero-parallax-bg');
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            
            // Keep the hero background image completely static/pinned in the viewport as the page overlays
            if (heroBg && scrollY <= windowHeight) {
                heroBg.style.transform = `translateY(${scrollY}px)`;
            }

            // Auto-hide navigation & quick chips on scroll down, show on scroll up to the top
            const nav = document.querySelector('.dd-nav');
            const chips = document.getElementById('dd-quick-chips');
            
            if (scrollY > lastScrollY) {
                // Scrolling down: hide both, remove gaps by sliding chips completely out and aligning top offset to 0px
                if (scrollY > 80) {
                    if (nav) nav.style.transform = 'translateY(-100%)';
                    if (chips) {
                        chips.style.transform = 'translateY(-100%)';
                        chips.style.top = '0px';
                    }
                }
            } else {
                // Scrolling up: only reveal both when scrolling back up near the top of the page (to prevent gaps in the middle)
                if (scrollY < 180) {
                    if (nav) nav.style.transform = 'translateY(0)';
                    if (chips) {
                        chips.style.transform = 'translateY(0)';
                        chips.style.top = '60px';
                    }
                }
            }
            
            lastScrollY = scrollY;
        });

document.addEventListener('DOMContentLoaded', () => {

            if (document.getElementById('weather-temple-select')) {
                updateWeatherView();
            }

            // Initialize premium UI enhancements
            resetDdHeroTimer();
            initializeScrollReveals();
            initializeLazyImageObserver();

            // Set up MutationObserver to auto-wire lazy image loaders for dynamic Supabase updates
            const imageObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'IMG' && node.getAttribute('loading') === 'lazy') {
                            if (node.complete) node.classList.add('dd-loaded');
                            else node.addEventListener('load', () => node.classList.add('dd-loaded'));
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('img[loading="lazy"]').forEach(img => {
                                if (img.complete) img.classList.add('dd-loaded');
                                else img.addEventListener('load', () => img.classList.add('dd-loaded'));
                            });
                        }
                    });
                });
            });
            imageObserver.observe(document.body, { childList: true, subtree: true });

            const initTasks = [
                ddBootstrap().catch(() => { }),
                loadRegisteredTemples().catch(() => { }),
            ];

            updateBookingView();
            updateParkingView();
            loadProfileFromStorage();


});

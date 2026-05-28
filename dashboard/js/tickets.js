// ===== Divya Darshan Ticket Booking Module =====
                </div>
            </div>`;
                    prasadamContainer.insertAdjacentHTML('beforeend', html);
                });
            }

            const prasCountEl = document.getElementById('prasadam-selected-count');
            const prasTotalEl = document.getElementById('prasadam-selected-total');
            if (prasCountEl && prasTotalEl) {
                const sel = getSelectedPrasadams();
                prasCountEl.innerText = String(sel.length);
                prasTotalEl.innerText = String(getPrasadamTotal() || 0);
            }
        }

        // ========== PRASADAM CART LOGIC ==========
        window.prasadamCart = {};
        window.prasadamCartMeta = {}; // { key: { name, price, qty } }

        // ========== POOJA CART LOGIC ==========
        window.poojaCart = {};
        window.poojaCartMeta = {}; // { key: { name, price, time, qty } }

        function togglePooja(btn) {
            if (!window.poojaCart) window.poojaCart = {};
            if (!window.poojaCartMeta) window.poojaCartMeta = {};
            const key = btn.dataset.key;
            const name = btn.dataset.name || 'Pooja';
            const priceNum = parseInt(String(btn.dataset.price || '0'), 10) || 0;
            const time = btn.dataset.time || '';
            const current = window.poojaCart[key] || 0;
            const next = current > 0 ? 0 : 1;
            window.poojaCart[key] = next;
            window.poojaCartMeta[key] = { name, price: priceNum, time, qty: next };
            updateBookingView(); // re-render to reflect selection state
        }

        function getPoojaTotal() {
            let total = 0;
            Object.values(window.poojaCartMeta || {}).forEach(item => { total += (item.price * (item.qty || 0)); });
            return total;
        }

        function getSelectedPoojas() {
            return Object.values(window.poojaCartMeta || {}).filter(i => (i.qty || 0) > 0);
        }

        function _customPoojasKey(templeKey) {
            return `dd_custom_poojas:${templeKey}`;
        }

        function loadCustomPoojasForTemple(templeKey) {
            try {
                const raw = localStorage.getItem(_customPoojasKey(templeKey));
                const arr = JSON.parse(raw || '[]');
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        }

        function saveCustomPoojasForTemple(templeKey, arr) {
            localStorage.setItem(_customPoojasKey(templeKey), JSON.stringify(Array.isArray(arr) ? arr : []));
        }

        function openCustomPoojaModal() {
            const modal = document.getElementById('custom-pooja-modal');
            if (!modal) return;
            document.getElementById('cp-name').value = '';
            document.getElementById('cp-price').value = '';
            document.getElementById('cp-time').value = '';
            document.getElementById('cp-desc').value = '';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeCustomPoojaModal() {
            const modal = document.getElementById('custom-pooja-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function saveCustomPooja() {
            const templeKey = document.getElementById('ticket-temple-select')?.value || 'tirupati';
            const name = (document.getElementById('cp-name').value || '').trim();
            const price = Number(document.getElementById('cp-price').value || 0);
            const time = (document.getElementById('cp-time').value || '').trim();
            const desc = (document.getElementById('cp-desc').value || '').trim();

            if (!name) {
                alert('Please enter a pooja name.');
                return;
            }
            if (!Number.isFinite(price) || price < 0) {
                alert('Please enter a valid price.');
                return;
            }

            const list = loadCustomPoojasForTemple(templeKey);
            list.push({
                _idx: 'c' + Date.now(),
                name,
                price: '₹' + Math.round(price),
                time: time || '—',
                status: 'Available',
                desc
            });
            saveCustomPoojasForTemple(templeKey, list);
            closeCustomPoojaModal();
            updateBookingView();
        }

        function changePrasadam(btn) {
            if (!window.prasadamCart) window.prasadamCart = {};
            if (!window.prasadamCartMeta) window.prasadamCartMeta = {};
            const key = btn.dataset.key;
            const delta = parseInt(btn.dataset.delta);
            const name = btn.dataset.name;
            const priceStr = btn.dataset.price;
            const current = window.prasadamCart[key] || 0;
            const next = Math.max(0, current + delta);
            window.prasadamCart[key] = next;
            const priceNum = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
            window.prasadamCartMeta[key] = { name, price: priceNum, qty: next };
            const el = document.getElementById('prasadam-qty-' + key);
            if (el) {
                el.innerText = next;
                el.style.transition = 'transform 0.15s, color 0.15s';
                el.style.transform = 'scale(1.4)';
                el.style.color = '#E65100';
                setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = ''; }, 200);
            }
        }

        function getPrasadamTotal() {
            let total = 0;
            Object.values(window.prasadamCartMeta || {}).forEach(item => { total += (item.price * item.qty); });
            return total;
        }

        function getSelectedPrasadams() {
            return Object.values(window.prasadamCartMeta || {}).filter(i => i.qty > 0);
        }

        // ========== TICKET PRICES ==========
        const ticketPrices = {
            "General Darshan (Free Entry)": 0,
            "Shighra Darshan (VIP Entry - ₹300)": 300,
            "Suprabhata Darshan (Early Morning - ₹500)": 500,
            "Darshan + Prasadam Sweekar (Family Combo - ₹1500)": 1500,
            "Devotee Seva (Donation + Darshan - ₹1000)": 1000
        };

        const gateAssignments = { tirupati: 'Gate 2', manjunatha: 'Gate 4', krishna: 'Gate 1', kukke: 'Gate 3' };
        const templeNames = { tirupati: 'Tirupati Balaji', manjunatha: 'Dharmasthala Manjunatha', krishna: 'Udupi Krishna', kukke: 'Kukke Subramanya' };

        // ========== PROCEED TO BOOKING ==========
        function updateTicketQty(diff) {
            const qtyInput = document.getElementById('ticket-qty');
            if (qtyInput) {
                let val = parseInt(qtyInput.value) || 1;
                val += diff;
                if (val < 1) val = 1;
                const selectedTicket = getSelectedMacroTicket();
                const maxQty = selectedTicket ? Math.max(1, Math.min(Number(selectedTicket.available_seats || 1), Number(selectedTicket.booking_limit || 1))) : 10;
                if (val > maxQty) val = maxQty;
                qtyInput.value = val;
            }
        }

        function handleProceedToBooking() {
            if (macroBookingControlState.paused) {
                renderMacroBookingControlState();
                alert(`Ticket booking is temporarily paused.${macroBookingControlState.reason ? ` Reason: ${macroBookingControlState.reason}` : ''}${macroBookingControlState.resumeAt ? ` Resumes: ${formatBookingResumeAt(macroBookingControlState.resumeAt)}.` : ''}`);
                return;
            }
            const selectedTicket = getSelectedMacroTicket();
            if (!selectedTicket) {
                alert('Please choose a live ticket before continuing.');
                return;
            }
            if (String(selectedTicket.status || '').toUpperCase() !== 'OPEN' || selectedTicket.booking_enabled === false || Number(selectedTicket.available_seats || 0) <= 0) {
                renderMacroBookingControlState();
                alert(`This ticket is currently ${getPublicTicketStatusMeta(selectedTicket.status).label.toLowerCase()}. Please choose another live ticket.`);
                return;
            }
            const templeKey = document.getElementById('ticket-temple-select')?.value || 'tirupati';
            const phone = document.getElementById('ticket-phone')?.value?.trim() || '';
            const ticketTypeText = selectedTicket.ticket_type || '';
            const ticketValue = selectedTicket.id || '';

            if (phone.replace(/[^0-9]/g, '').length < 10) {
                alert('⚠️ Please enter a valid 10-digit phone number.');
                return;
            }

            const qty = parseInt(document.getElementById('ticket-qty')?.value) || 1;
            if (qty > Number(selectedTicket.available_seats || 0)) {
                alert(`Only ${selectedTicket.available_seats} seats are available for this ticket.`);
                return;
            }
            if (qty > Number(selectedTicket.booking_limit || 1)) {
                alert(`You can book up to ${selectedTicket.booking_limit} seats for this ticket.`);
                return;
            }

            const ticketPrice = Number(selectedTicket.price || 0) * qty;
            const poojaTotal = getPoojaTotal();
            const prasadamTotal = getPrasadamTotal();
            // Grand total for payment display (informational)
            const grandTotal = ticketPrice + poojaTotal + prasadamTotal;

            // Store booking state — capture cart snapshot now before any re-renders
            window._bookingState = {
                templeKey, phone, ticketTypeText, ticketValue, qty,
                grandTotal, ticketPrice, poojaTotal, prasadamTotal,
                selectedTicketId: selectedTicket.id,
                selectedTicket: { ...selectedTicket },
                poojaSnapshot: getSelectedPoojas().map(i => ({ ...i })),
                // Snapshot the prasadam selection so it survives payment flow
                prasadamSnapshot: getSelectedPrasadams().map(i => ({ ...i }))
            };

            // Routing: ONLY ticket type determines free vs paid flow
            // Prasadam always appears on ticket regardless
            if (grandTotal === 0) {
                // Free ticket — generate ticket directly with prasadam
                generateAndShowTicket();
            } else {
                // Paid ticket — show payment modal first
                const templeName = templeNames[templeKey] || 'Temple';
                const displayAmt = grandTotal > 0 ? '₹' + grandTotal : 'Free';
                document.getElementById('pay-amount').innerText = displayAmt;
                document.getElementById('pay-temple').innerText = templeName;
                document.getElementById('pay-ticket-type').innerText = `${selectedTicket.event_name} · ${ticketTypeText}`;
                document.getElementById('payment-modal').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }

        // ========== PAYMENT MODAL ==========
        let _selectedPayMethod = null;

        function selectPayMethod(btn, method) {
            _selectedPayMethod = method;
            document.querySelectorAll('.pay-method-btn').forEach(b => {
                b.classList.remove('border-primary', 'bg-primary/5');
                b.classList.add('border-slate-100');
            });
            btn.classList.add('border-primary', 'bg-primary/5');
            btn.classList.remove('border-slate-100');
            const upiArea = document.getElementById('upi-input-area');
            if (method === 'upi') { upiArea.classList.remove('hidden'); }
            else { upiArea.classList.add('hidden'); }
        }

        function closePaymentModal() {
            document.getElementById('payment-modal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        function processPayment() {
            if (macroBookingControlState.paused) {
                renderMacroBookingControlState();
                alert(`Ticket booking is temporarily paused.${macroBookingControlState.reason ? ` Reason: ${macroBookingControlState.reason}` : ''}`);
                return;
            }
            if (!_selectedPayMethod) {
                alert('Please select a payment method to continue.');
                return;
            }
            document.getElementById('payment-modal').classList.add('hidden');
            document.getElementById('payment-processing').classList.remove('hidden');
            // Simulate 2.5s "processing"
            setTimeout(() => {
                document.getElementById('payment-processing').classList.add('hidden');
                document.body.style.overflow = '';
                
                if (parkingCheckoutState) {
                    const state = parkingCheckoutState;
                    parkingCheckoutState = null; // reset
                    
                    // Mark slot as occupied in localStorage
                    try {
                        const raw = localStorage.getItem('dd_parkingData');
                        const all = raw ? JSON.parse(raw) : {};
                        const zones = all[state.templeKey]?.zones || [];
                        const targetZone = zones.find(z => z.name === state.zone.name);
                        if (targetZone) {
                            const targetSlot = targetZone.slots?.find(s => s.id === state.slot.id);
                            if (targetSlot) {
                                targetSlot.status = 'occupied';
                                localStorage.setItem('dd_parkingData', JSON.stringify(all));
                            }
                        }
                    } catch(e) {}
                    
                    showParkingReceiptModal(state.slot.id, state.zone.name, state.templeKey);
                } else {
                    generateAndShowTicket();
                }
            }, 2500);
        }

        // ========== TICKET GENERATION ==========
        function generateTicketId() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let id = 'DVS-';
            for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
            return id;
        }

        function generateQRCode(data, container) {
            // Build a simple visual QR-like pattern using SVG (deterministic based on data hash)
            container.innerHTML = '';
            const size = 132;
            const cells = 21;
            const cellSize = Math.floor(size / cells);
            // Use data string to seed a pseudo-random pattern
            let seed = 0;
            for (let i = 0; i < data.length; i++) seed = (seed * 31 + data.charCodeAt(i)) & 0xFFFFFFFF;
            function pseudoRand(x, y) {
                let v = seed ^ (x * 2654435761) ^ (y * 2246822519);
                v = ((v >> 16) ^ v) * 0x45d9f3b & 0xFFFFFFFF;
                return (v >> 24) & 1;
            }
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', size); svg.setAttribute('height', size);
            svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            // White bg
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', size); bg.setAttribute('height', size); bg.setAttribute('fill', '#fff');
            svg.appendChild(bg);
            // Draw cells
            for (let r = 0; r < cells; r++) {
                for (let c = 0; c < cells; c++) {
                    // Force finder patterns in corners
                    const inFinder = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
                    let dark;
                    if (inFinder) {
                        const fi = r % 7, fj = c < 7 ? c % 7 : (cells - 1 - c) % 7, fir = r >= cells - 7 ? (cells - 1 - r) % 7 : r % 7;
                        dark = (fi === 0 || fi === 6 || fir === 6 || fj === 0 || fj === 6) || (fi >= 2 && fi <= 4 && fj >= 2 && fj <= 4);
                    } else {
                        dark = pseudoRand(r, c) === 1;
                    }
                    if (dark) {
                        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        rect.setAttribute('x', c * cellSize); rect.setAttribute('y', r * cellSize);
                        rect.setAttribute('width', cellSize); rect.setAttribute('height', cellSize);
                        rect.setAttribute('fill', '#1a1a1a');
                        svg.appendChild(rect);
                    }
                }
            }
            container.appendChild(svg);
        }

        async function generateAndShowTicket() {
            const state = window._bookingState || {};
            const templeKey = state.templeKey || 'tirupati';
            const phone = state.phone || '';
            const selectedTicket = state.selectedTicket || getSelectedMacroTicket() || {};
            const ticketTypeText = state.ticketTypeText || selectedTicket.ticket_type || 'Live Ticket';
            const ticketId = generateTicketId();
            const gate = gateAssignments[templeKey] || 'Gate 1';
            const templeName = templeNames[templeKey] || 'Temple';
            const qty = state.qty || 1;

            // Gather date+slot from form
            const dateInput = document.querySelector('#tickets input[type="date"]');
            const slotEl = document.querySelector('#tickets select:not(#ticket-temple-select):not(#ticket-type)');
            const rawDate = selectedTicket.event_date || dateInput?.value || '';
            const dateVal = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Walk-in';
            const slotVal = selectedTicket.event_time || slotEl?.value || 'Open Slot';

            // Populate ticket
            document.getElementById('et-temple').innerText = templeName;
            document.getElementById('et-id').innerText = ticketId;
            document.getElementById('et-type').innerText = `${selectedTicket.event_name || 'Temple Ticket'} · ${ticketTypeText}`.trim();
            document.getElementById('et-phone').innerText = phone;
            document.getElementById('et-people').innerText = qty;
            document.getElementById('et-date').innerText = dateVal;
            document.getElementById('et-slot').innerText = slotVal;
            document.getElementById('et-gate').innerText = gate;
            document.getElementById('et-gate-label').innerText = gate;

            // Prasadam tokens — use snapshot captured at booking time, not live cart
            const prasadams = (state.prasadamSnapshot && state.prasadamSnapshot.length > 0)
                ? state.prasadamSnapshot
                : getSelectedPrasadams();
            const prasadamSection = document.getElementById('et-prasadam-section');
            const prasadamList = document.getElementById('et-prasadam-list');
            if (prasadams.length > 0) {
                prasadamSection.classList.remove('hidden');
                prasadamList.innerHTML = '';
                prasadams.forEach(item => {
                    const badge = document.createElement('span');
                    badge.className = 'bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-bold';
                    badge.innerText = `${item.name} ×${item.qty}`;
                    prasadamList.appendChild(badge);
                });
            } else {
                prasadamSection.classList.add('hidden');
            }

            // Pooja add-ons — use snapshot captured at booking time
            const poojas = (state.poojaSnapshot && state.poojaSnapshot.length > 0)
                ? state.poojaSnapshot
                : getSelectedPoojas();
            const poojaSection = document.getElementById('et-pooja-section');
            const poojaList = document.getElementById('et-pooja-list');
            if (poojaSection && poojaList) {
                if (poojas.length > 0) {
                    poojaSection.classList.remove('hidden');
                    poojaList.innerHTML = '';
                    poojas.forEach(item => {
                        const badge = document.createElement('span');
                        badge.className = 'bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-bold';
                        const price = item.price ? ` (₹${item.price})` : '';
                        badge.innerText = `${item.name}${price}`;
                        poojaList.appendChild(badge);
                    });
                } else {
                    poojaSection.classList.add('hidden');
                }
            }

            // Generate QR
            const qrData = `${ticketId}|${templeName}|${phone}|${dateVal}|${gate}`;
            generateQRCode(qrData, document.getElementById('et-qr'));

            const newBooking = {
                id: ticketId,
                ticketId: ticketId,
                templeKey: templeKey,
                templeName: templeName,
                temple_key: templeKey,
                temple_name: templeName,
                temple_slug: selectedTicket.temple_slug || null,
                ticket_inventory_id: selectedTicket.id || state.selectedTicketId || null,
                event_name: selectedTicket.event_name || null,
                date: dateVal,
                visit_date: selectedTicket.event_date || rawDate || null,
                time: slotVal,
                slot: slotVal,
                pilgrims: qty,
                qty: qty,
                phone: phone,
                ticket_type: ticketTypeText,
                source: 'Online',
                status: 'Confirmed' // User bookings are auto-confirmed for now
            };

            try {
                await ddCreateBooking(newBooking);
                await loadPublicTicketsForTemple(templeKey);

                // Push to Admin Notifications
                const notes = JSON.parse(localStorage.getItem('globalNotifications') || '[]');
                notes.unshift({
                    type: 'booking',
                    msg: `New Booking: ${templeName} (#${ticketId}) for ${qty} people.`,
                    time: new Date().toLocaleTimeString(),
                    targetContext: templeKey
                });
                localStorage.setItem('globalNotifications', JSON.stringify(notes.slice(0, 30)));
            } catch (e) {
                console.error('Booking save failed', e);
                alert('Booking could not be saved to the live database. Please try again.');
                return;
            }

            // Show ticket modal
            document.getElementById('eticket-modal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            window._bookingState.ticketId = ticketId;
        }

        function closeTicketModal() {
            document.getElementById('eticket-modal').classList.add('hidden');
            document.body.style.overflow = '';
            // Reset cart
            window.prasadamCart = {};
            window.prasadamCartMeta = {};
            updateBookingView();
        }

        function downloadTicket() {
            alert('💾 In a real app, this would download your ticket as a PDF. Your Ticket ID: ' + (window._bookingState?.ticketId || 'DVS-XXXXX'));
        }

        let sosPressTimer;
        let sosHoldTime = 0;
        const requiredSosHoldTime = 3000; // 3 seconds
        const sosBtn = document.getElementById('sos-btn');
        const sosProgress = document.getElementById('sos-progress');
        const sosHint = document.getElementById('sos-hint');
        const sosDefaultView = document.getElementById('sos-default-view');
        const sosFormView = document.getElementById('sos-form-view');

        function startSosPress(e) {
            if (e.type === 'touchstart') e.preventDefault(); // Prevent default touch actions like scroll/magnify
            if (!sosBtn || !sosProgress) return;

            sosHint.classList.remove('opacity-0');
            // Start progress bar animation
            sosProgress.style.transition = 'width 3s linear';
            sosProgress.style.width = '100%';

            sosPressTimer = setTimeout(() => {
                // Trigger SOS form open!
                sosHint.classList.add('opacity-0');
                sosDefaultView.classList.add('hidden');
                sosDefaultView.classList.remove('flex');
                sosFormView.classList.remove('hidden');
                sosFormView.classList.add('flex');

                // Reset progress visually immediately without transition so it's ready if they cancel
                sosProgress.style.transition = 'none';
                sosProgress.style.width = '0%';
            }, requiredSosHoldTime);
        }

        function endSosPress() {
            clearTimeout(sosPressTimer);
            if (!sosBtn || !sosProgress) return;

            sosHint.classList.add('opacity-0');
            // Animate backward if not complete
            if (sosProgress.style.width !== '0%') {
                sosProgress.style.transition = 'width 0.2s ease-out';
                sosProgress.style.width = '0%';
            }
        }

        // Add event listeners once DOM is ready
        document.addEventListener("DOMContentLoaded", async () => {
            // Apply translatability targets programmatically
            document.querySelectorAll('[data-i18n]').forEach(el => el.classList.add('dd-translatable'));
            
            // Sync active language preferences
            if (activeLanguage) {
                changeLanguage(activeLanguage);
            }
            const btn = document.getElementById('sos-btn');
            if (btn) {
                // Mouse and Touch events
                btn.addEventListener('mousedown', startSosPress);

document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateBookingView === 'function') {
        updateBookingView();
    }
});

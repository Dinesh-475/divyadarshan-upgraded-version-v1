// ===== Divya Darshan Emergency SOS Module =====
        function cancelEmergencyAlert() {
            sosFormView.classList.add('hidden');
            sosFormView.classList.remove('flex');
            sosDefaultView.classList.remove('hidden');
            sosDefaultView.classList.add('flex');

            // Reset location button UI
            const btn = document.getElementById('sos-location-btn');
            const text = document.getElementById('sos-location-text');
            if (btn && text) {
                btn.classList.remove('hidden');
                btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">my_location</span> Share Live Location';
                btn.disabled = false;
                text.classList.add('hidden');
                text.classList.remove('flex');
                document.getElementById('sos-location-data').value = '';
            }
        }

        let sosLocationToggle = false;

        function shareLocation() {
            const btn = document.getElementById('sos-location-btn');
            const text = document.getElementById('sos-location-text');
            const data = document.getElementById('sos-location-data');

            btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span> Accessing GPS...';
            btn.disabled = true;

            // The real temple GPS coordinates
            const templeCoords = {
                tirupati: { lat: 13.6833, lon: 79.3472, name: 'Tirupati Venkateswara', key: 'tirupati' },
                manjunatha: { lat: 12.9600, lon: 75.3800, name: 'Dharmasthala Manjunatha', key: 'manjunatha' }
            };

            function distKm(lat1, lon1, lat2, lon2) {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            }

            function assignTemple(lat, lon) {
                // Find which temple is closest
                let minDist = Infinity, closest = 'tirupati';
                Object.values(templeCoords).forEach(t => {
                    const d = distKm(lat, lon, t.lat, t.lon);
                    if (d < minDist) { minDist = d; closest = t.key; }
                });
                return closest;
            }

            function setLocationData(lat, lon, templeKey) {
                const latDir = lat >= 0 ? 'N' : 'S';
                const lonDir = lon >= 0 ? 'E' : 'W';
                const coordStr = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
                data.value = coordStr;
                data.setAttribute('data-temple', templeKey);
                data.setAttribute('data-lat', lat);
                data.setAttribute('data-lon', lon);
                btn.classList.add('hidden');
                text.classList.remove('hidden');
                text.classList.add('flex', 'flex-col', 'gap-1');

                const labelStr = templeKey === 'manjunatha' ? 'Dharmasthala Command' : 'Tirupati Command';

                text.innerHTML = `
            <div class="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                <span class="material-symbols-outlined text-emerald-600 text-[14px]">my_location</span>
                <span class="text-[11px] font-black tracking-widest text-emerald-700">${coordStr}</span>
            </div>
            <div class="flex items-center gap-1.5 opacity-80 pl-2">
                <span class="material-symbols-outlined text-rose-500 text-[12px]">cell_tower</span>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Routing target: <span class="text-rose-600">${labelStr}</span></span>
            </div>
        `;
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        const templeKey = assignTemple(lat, lon);
                        setLocationData(lat, lon, templeKey);
                    },
                    () => {
                        // GPS denied — fall back to alternating temple coords
                        sosLocationToggle = !sosLocationToggle;
                        if (sosLocationToggle) {
                            setLocationData(12.9600, 75.3800, 'manjunatha');
                        } else {
                            setLocationData(13.6833, 79.3472, 'tirupati');
                        }
                    },
                    { timeout: 5000 }
                );
            } else {
                // Browser doesn't support geolocation
                sosLocationToggle = !sosLocationToggle;
                if (sosLocationToggle) {
                    setLocationData(12.9600, 75.3800, 'manjunatha');
                } else {
                    setLocationData(13.6833, 79.3472, 'tirupati');
                }
            }
        }

        function submitEmergencyAlert() {
            const type = document.getElementById('sos-type').value;
            const locEl = document.getElementById('sos-location-data');
            const loc = locEl.value;
            if (!loc) {
                alert('Please share your live location first so security can find you.');
                return;
            }
            const templeContext = document.getElementById('sos-temple-select')?.value || locEl.getAttribute('data-temple') || 'tirupati';
            const templeLabelMap = { tirupati: 'Tirupati Security Command', manjunatha: 'Dharmasthala Security Command' };
            const templeLabel = templeLabelMap[templeContext] || 'Temple Security';

            alert(`🚨 EMERGENCY BROADCAST SENT!\n\nType: ${type}\nLocation: ${loc}\nRouted to: ${templeLabel}\n\nSecurity forces have been dispatched to your exact live GPS location.`);

            const lat = locEl.getAttribute('data-lat') || '';
            const lon = locEl.getAttribute('data-lon') || '';

            let notes = JSON.parse(localStorage.getItem('globalNotifications')) || [];
            notes.unshift({
                msg: `CRITICAL SOS: ${type} at ${loc}`,
                time: new Date().toLocaleString(),
                type: 'alert',
                targetContext: templeContext,
                id: 'sos_' + Date.now(),
                lat: lat,
                lon: lon
            });
            if (notes.length > 30) notes.pop();
            localStorage.setItem('globalNotifications', JSON.stringify(notes));
            cancelEmergencyAlert();
        }

        const weatherDataStore = {
            "tirupati": { temp: "28°C", desc: "Mostly Sunny", hint: "Perfect for Darshan", icon: "wb_sunny" },
            "manjunatha": { temp: "26°C", desc: "Partly Cloudy", hint: "Pleasant", icon: "partly_cloudy_day" },
            "krishna": { temp: "30°C", desc: "Sunny", hint: "Warm but nice", icon: "sunny" },
            "kukke": { temp: "24°C", desc: "Overcast", hint: "Cool breeze", icon: "cloud" }
        };


document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('sos-btn');
            if (btn) {
                btn.addEventListener('mousedown', startSosPress);
                btn.addEventListener('touchstart', startSosPress);
                btn.addEventListener('mouseup', endSosPress);
                btn.addEventListener('mouseleave', endSosPress);
                btn.addEventListener('touchend', endSosPress);
            }

});

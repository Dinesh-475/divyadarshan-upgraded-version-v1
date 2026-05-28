// ===== Divya Darshan Sacred Parking Module =====
            }
            if (payload?.ticket_inventory?.temple_key) {
                const templeKey = payload.ticket_inventory.temple_key;
                const current = macroTicketInventoryState.ticketsByTemple[templeKey] || [];
                macroTicketInventoryState.ticketsByTemple[templeKey] = current.map((ticket) =>
                    ticket.id === payload.ticket_inventory.id ? payload.ticket_inventory : ticket
                );
                renderPublicTicketInventory(templeKey);
            }
            let bookings = JSON.parse(localStorage.getItem('dd_bookings') || '[]');
            bookings.push({ ...payload, created_at: payload.created_at || new Date().toISOString() });
            localStorage.setItem('dd_bookings', JSON.stringify(bookings));
            return payload;
        }

        // ===== LIVE PARKING (localStorage-backed — synced from Admin) =====
        function getUserParkingData(templeKey) {
            try {
                const raw = localStorage.getItem('dd_parkingData');
                const all = raw ? JSON.parse(raw) : {};
                return all[templeKey] ? all[templeKey].zones : [];
            } catch (e) { return []; }
        }

        async function renderUserParkingZones(templeKey) {
            const container = document.getElementById('user-parking-zones');
            if (!container) return;
            if (!templeKey) {
                container.innerHTML = '<p class="text-xs text-slate-400">Select a temple to view parking</p>';
                return;
            }
            window._ddCurrentParkingTempleKey = templeKey;
            const zones = getUserParkingData(templeKey);
            if (!zones || zones.length === 0) {
                container.innerHTML = '<p class="text-xs text-slate-400">No parking info available.</p>';
                return;
            }
            container.innerHTML = zones.map((z, i) => {
                const available = Math.max(0, z.capacity - z.filled);
                const pct = Math.round((z.filled / z.capacity) * 100);
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500';
                const slotColor = available === 0 ? 'text-red-600' : available < 10 ? 'text-orange-600' : 'text-emerald-600';
return `
            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div class="flex justify-between items-center mb-1">
                    <div>
                        <p class="text-xs font-bold text-slate-700">${z.name}</p>
                        <p class="text-[10px] text-slate-400">${z.distance || ''} away</p>
                    </div>
                    <div class="text-right">
                        <span class="text-lg font-black ${slotColor}">${available}</span>
                        <p class="text-[9px] font-bold uppercase text-slate-400">free</p>
                    </div>
                </div>
                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div class="${barColor} h-full rounded-full transition-all" style="width:${pct}%"></div>
                </div>
                ${available > 0
                        ? `<button onclick="bookUserParkingSlot('${templeKey}', ${i})" class="w-full text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 py-1.5 rounded-lg transition-colors">Reserve Slot</button>`
                        : '<p class="text-center text-[10px] font-bold text-red-500 py-1">FULL</p>'}
            </div>
        `;
            }).join('');
        }

        // ===== LIVE PARKING GLOBALS & THREE.JS VEHICLE RENDERER =====
        let currentParkingZoneIdx = 0;
        let selectedSlotId = null;
        let selectedSlotDetails = null;
        let threeScene, threeCamera, threeRenderer, threeVehicleGroup;
        let isThreeDragging = false;
        let threePreviousMousePosition = { x: 0, y: 0 };
        let threeAnimationId = null;

        function initThreeJsVehicleRenderer() {
            const canvas = document.getElementById('parking-vehicle-canvas');
            if (!canvas) return;

            // If already initialized, just make sure to resize and return
            if (threeRenderer) {
                const rect = canvas.parentElement.getBoundingClientRect();
                threeRenderer.setSize(rect.width, rect.height);
                threeCamera.aspect = rect.width / rect.height;
                threeCamera.updateProjectionMatrix();
                return;
            }

            const rect = canvas.parentElement.getBoundingClientRect();

            // Scene
            threeScene = new THREE.Scene();
            threeScene.background = new THREE.Color('#0f172a'); // Slate 900

            // Camera
            threeCamera = new THREE.PerspectiveCamera(40, rect.width / rect.height, 0.1, 100);
            threeCamera.position.set(3, 2.5, 4.5);
            threeCamera.lookAt(0, 0.4, 0);

            // Renderer
            threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            threeRenderer.setSize(rect.width, rect.height);
            threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            threeScene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(5, 8, 5);
            threeScene.add(dirLight);

            const pointLight = new THREE.PointLight(0xea580c, 1.2, 10); // Amber point light glow
            pointLight.position.set(0, 1.5, 0);
            threeScene.add(pointLight);

            // Ground grid to simulate asphalt
            const gridHelper = new THREE.GridHelper(10, 20, 0x475569, 0x334155);
            gridHelper.position.y = 0;
            threeScene.add(gridHelper);

            // Vehicle Group
            threeVehicleGroup = new THREE.Group();
            threeVehicleGroup.position.y = 0;
            threeScene.add(threeVehicleGroup);

            // Interactive dragging controls
            canvas.addEventListener('mousedown', (e) => {
                isThreeDragging = true;
                threePreviousMousePosition = { x: e.clientX, y: e.clientY };
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!isThreeDragging) return;
                const deltaMove = {
                    x: e.clientX - threePreviousMousePosition.x,
                    y: e.clientY - threePreviousMousePosition.y
                };

                threeVehicleGroup.rotation.y += deltaMove.x * 0.01;
                threeVehicleGroup.rotation.x += deltaMove.y * 0.01;
                // Clamp X rotation to prevent flipping upside down
                threeVehicleGroup.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, threeVehicleGroup.rotation.x));

                threePreviousMousePosition = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', () => {
                isThreeDragging = false;
            });

            // Touch support for mobile dragging
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    isThreeDragging = true;
                    threePreviousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
            });

            canvas.addEventListener('touchmove', (e) => {
                if (!isThreeDragging || e.touches.length !== 1) return;
                const deltaMove = {
                    x: e.touches[0].clientX - threePreviousMousePosition.x,
                    y: e.touches[0].clientY - threePreviousMousePosition.y
                };

                threeVehicleGroup.rotation.y += deltaMove.x * 0.01;
                threeVehicleGroup.rotation.x += deltaMove.y * 0.01;
                threeVehicleGroup.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, threeVehicleGroup.rotation.x));

                threePreviousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            window.addEventListener('touchend', () => {
                isThreeDragging = false;
            });

            // Populate default vehicle (car)
            selectUserVehicleType('car');

            // Animation Loop
            let lastTime = 0;
            function animate(time) {
                threeAnimationId = requestAnimationFrame(animate);

                // Idle hover scale & wobble
                const elapsed = time * 0.001; // seconds
                if (!isThreeDragging) {
                    threeVehicleGroup.rotation.y += 0.005; // slowly rotate
                    // subtle engine vibration vibration/bounce
                    threeVehicleGroup.position.y = Math.sin(elapsed * 8) * 0.02 + 0.02;
                }

                threeRenderer.render(threeScene, threeCamera);
            }

            if (threeAnimationId) {
                cancelAnimationFrame(threeAnimationId);
            }
            animate(0);

            // Handle Resize
            const resizeObserver = new ResizeObserver(() => {
                if (!canvas || !threeRenderer) return;
                const r = canvas.parentElement.getBoundingClientRect();
                threeRenderer.setSize(r.width, r.height);
                threeCamera.aspect = r.width / r.height;
                threeCamera.updateProjectionMatrix();
            });
            resizeObserver.observe(canvas.parentElement);
        }

        function selectUserVehicleType(type) {
            // Update active states on tab buttons
            const tabs = ['car', 'bike', 'ev', 'disabled', 'heavy'];
            tabs.forEach(t => {
                const btn = document.getElementById(`vtab-${t}`);
                if (btn) {
                    if (t === type) {
                        btn.className = "vtab-btn p-2 rounded-xl flex flex-col items-center gap-1 transition-all bg-slate-900 border-2 border-primary shadow-sm text-primary scale-95";
                    } else {
                        btn.className = "vtab-btn p-2 rounded-xl flex flex-col items-center gap-1 transition-all bg-white border border-slate-150 text-slate-500 hover:bg-slate-50";
                    }
                }
            });

            // Update interactive 2D illustration preview
            drawSidebarVehiclePreview(type);

            // Re-render calculations dynamically if a slot is active
            if (selectedSlotId) {
                const el = document.getElementById('parking-temple-select');
                const templeKey = el ? el.value : 'tirupati';
                let all = {};
                try { all = JSON.parse(localStorage.getItem('dd_parkingData')) || {}; } catch(e) {}
                const zones = all[templeKey]?.zones || [];
                const zone = zones[currentParkingZoneIdx];
                
                let hourlyRate = 60;
                if (type === 'bike') hourlyRate = 20;
                else if (type === 'ev') hourlyRate = 80;
                
                const rateStr = `₹${hourlyRate}/hr`;
                const baseFare = hourlyRate * selectedParkingDuration;
                const grandTotal = baseFare + 10 + (priorityShuttleSelected ? 30 : 0);
                
                const rateEl = document.getElementById('selected-spot-rate');
                if (rateEl) rateEl.innerText = rateStr;
                const summaryDurEl = document.getElementById('summary-duration');
                if (summaryDurEl) summaryDurEl.innerText = selectedParkingDuration;
                const summaryBaseEl = document.getElementById('summary-base-fare');
                if (summaryBaseEl) summaryBaseEl.innerText = `₹${baseFare}`;
                const summaryGrandEl = document.getElementById('summary-grand-total');
                if (summaryGrandEl) summaryGrandEl.innerText = `₹${grandTotal}`;
                const summaryBtnEl = document.getElementById('summary-btn-total');
                if (summaryBtnEl) summaryBtnEl.innerText = `₹${grandTotal}`;
            }

            if (!threeVehicleGroup) return;

            // Clear old children from threeVehicleGroup
            while (threeVehicleGroup.children.length > 0) {
                const child = threeVehicleGroup.children[0];
                threeVehicleGroup.remove(child);
            }

            // Material palettes
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.2, metalness: 0.1 }); // Orange
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // Slate-800
            const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1 }); // Chrome
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, roughness: 0.1 }); // Sky blue glass
            const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Light yellow glow
            const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red tail lights
            const evMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.2, metalness: 0.5 }); // Teal/neon electric

            if (type === 'bike') {
                // Main chassis
                const chassisGeo = new THREE.BoxGeometry(1.2, 0.15, 0.2);
                const chassis = new THREE.Mesh(chassisGeo, chromeMat);
                chassis.position.y = 0.45;
                threeVehicleGroup.add(chassis);

                // Bike body
                const bodyGeo = new THREE.BoxGeometry(0.8, 0.4, 0.24);
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.set(-0.1, 0.65, 0);
                threeVehicleGroup.add(body);

                // Seat
                const seatGeo = new THREE.BoxGeometry(0.45, 0.08, 0.22);
                const seat = new THREE.Mesh(seatGeo, wheelMat);
                seat.position.set(-0.2, 0.85, 0);
                threeVehicleGroup.add(seat);

                // Handlebars
                const forkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
                forkGeo.rotateZ(-Math.PI / 8);
                const fork = new THREE.Mesh(forkGeo, chromeMat);
                fork.position.set(0.4, 0.75, 0);
                threeVehicleGroup.add(fork);

                const handleBarGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
                handleBarGeo.rotateX(Math.PI / 2);
                const handlebars = new THREE.Mesh(handleBarGeo, wheelMat);
                handlebars.position.set(0.55, 1.1, 0);
                threeVehicleGroup.add(handlebars);

                // Wheels
                const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
                wheelGeo.rotateX(Math.PI / 2);

                const fWheel = new THREE.Mesh(wheelGeo, wheelMat);
                fWheel.position.set(0.55, 0.3, 0);
                threeVehicleGroup.add(fWheel);

                const bWheel = new THREE.Mesh(wheelGeo, wheelMat);
                bWheel.position.set(-0.55, 0.3, 0);
                threeVehicleGroup.add(bWheel);

                // Headlight
                const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
                const headlight = new THREE.Mesh(lightGeo, headlightMat);
                headlight.position.set(0.6, 0.95, 0);
                threeVehicleGroup.add(headlight);

            } else if (type === 'car') {
                // Main chassis / bottom
                const chassisGeo = new THREE.BoxGeometry(1.9, 0.15, 0.9);
                const chassis = new THREE.Mesh(chassisGeo, chromeMat);
                chassis.position.y = 0.35;
                threeVehicleGroup.add(chassis);

                // Main body
                const bodyGeo = new THREE.BoxGeometry(1.8, 0.45, 0.92);
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.set(0, 0.55, 0);
                threeVehicleGroup.add(body);

                // Cabin / Roof
                const cabGeo = new THREE.BoxGeometry(1.0, 0.45, 0.82);
                const cab = new THREE.Mesh(cabGeo, bodyMat);
                cab.position.set(-0.1, 0.95, 0);
                threeVehicleGroup.add(cab);

                // Glass windows
                const windshieldGeo = new THREE.BoxGeometry(0.3, 0.38, 0.8);
                windshieldGeo.rotateZ(-Math.PI / 6);
                const windshield = new THREE.Mesh(windshieldGeo, glassMat);
                windshield.position.set(0.42, 0.92, 0);
                threeVehicleGroup.add(windshield);

                const rearWindowGeo = new THREE.BoxGeometry(0.3, 0.38, 0.8);
                rearWindowGeo.rotateZ(Math.PI / 6);
                const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat);
                rearWindow.position.set(-0.6, 0.92, 0);
                threeVehicleGroup.add(rearWindow);

                const sideGlassGeo = new THREE.BoxGeometry(0.85, 0.32, 0.84);
                const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
                sideGlass.position.set(-0.1, 0.92, 0);
                threeVehicleGroup.add(sideGlass);

                // Wheels (4 cylinders)
                const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16);
                wheelGeo.rotateX(Math.PI / 2);

                const wheelPositions = [
                    [0.55, 0.24, 0.48], [0.55, 0.24, -0.48],
                    [-0.55, 0.24, 0.48], [-0.55, 0.24, -0.48]
                ];
                wheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    threeVehicleGroup.add(wheel);
                });

                // Headlights
                const lightGeo = new THREE.BoxGeometry(0.05, 0.1, 0.15);
                const leftLight = new THREE.Mesh(lightGeo, headlightMat);
                leftLight.position.set(0.9, 0.55, 0.3);
                threeVehicleGroup.add(leftLight);

                const rightLight = new THREE.Mesh(lightGeo, headlightMat);
                rightLight.position.set(0.9, 0.55, -0.3);
                threeVehicleGroup.add(rightLight);

                // Taillights
                const tailGeo = new THREE.BoxGeometry(0.04, 0.08, 0.18);
                const leftTail = new THREE.Mesh(tailGeo, taillightMat);
                leftTail.position.set(-0.9, 0.55, 0.3);
                threeVehicleGroup.add(leftTail);

                const rightTail = new THREE.Mesh(tailGeo, taillightMat);
                rightTail.position.set(-0.9, 0.55, -0.3);
                threeVehicleGroup.add(rightTail);

            } else if (type === 'ev') {
                // Sleek futuristic EV
                const chassisGeo = new THREE.BoxGeometry(1.8, 0.15, 0.95);
                const chassis = new THREE.Mesh(chassisGeo, chromeMat);
                chassis.position.y = 0.35;
                threeVehicleGroup.add(chassis);

                // Futuristic curved body
                const bodyGeo = new THREE.BoxGeometry(1.7, 0.5, 0.96);
                const body = new THREE.Mesh(bodyGeo, evMat);
                body.position.set(0, 0.55, 0);
                threeVehicleGroup.add(body);

                const cabGeo = new THREE.BoxGeometry(1.1, 0.45, 0.85);
                const cab = new THREE.Mesh(cabGeo, glassMat); // Glass canopy
                cab.position.set(-0.05, 0.92, 0);
                threeVehicleGroup.add(cab);

                // Wheels with glowing rims
                const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
                wheelGeo.rotateX(Math.PI / 2);

                const wheelPositions = [
                    [0.55, 0.24, 0.5], [0.55, 0.24, -0.5],
                    [-0.55, 0.24, 0.5], [-0.55, 0.24, -0.5]
                ];
                wheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    threeVehicleGroup.add(wheel);

                    // Add simple glowing teal wheel cap ring
                    const capGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.19, 8);
                    capGeo.rotateX(Math.PI / 2);
                    const cap = new THREE.Mesh(capGeo, evMat);
                    cap.position.set(pos[0], pos[1], pos[2]);
                    threeVehicleGroup.add(cap);
                });

                // Laser-like continuous thin headlight strip
                const lightStripGeo = new THREE.BoxGeometry(0.04, 0.05, 0.85);
                const headlightStrip = new THREE.Mesh(lightStripGeo, headlightMat);
                headlightStrip.position.set(0.85, 0.55, 0);
                threeVehicleGroup.add(headlightStrip);

                // Neon glowing strip along bottom edge
                const sideStripLGeo = new THREE.BoxGeometry(1.2, 0.03, 0.02);
                const sideStripL = new THREE.Mesh(sideStripLGeo, evMat);
                sideStripL.position.set(0, 0.35, 0.49);
                threeVehicleGroup.add(sideStripL);

                const sideStripR = new THREE.Mesh(sideStripLGeo, evMat);
                sideStripR.position.set(0, 0.35, -0.49);
                threeVehicleGroup.add(sideStripR);

            } else if (type === 'disabled') {
                // Accessible Open Canopy Cart / Golf Cart
                const floorGeo = new THREE.BoxGeometry(1.6, 0.08, 0.85);
                const floor = new THREE.Mesh(floorGeo, chromeMat);
                floor.position.y = 0.32;
                threeVehicleGroup.add(floor);

                // Front hood
                const hoodGeo = new THREE.BoxGeometry(0.5, 0.35, 0.8);
                const hood = new THREE.Mesh(hoodGeo, bodyMat);
                hood.position.set(0.5, 0.52, 0);
                threeVehicleGroup.add(hood);

                // Seats
                const benchGeo = new THREE.BoxGeometry(0.3, 0.3, 0.75);
                const bench = new THREE.Mesh(benchGeo, wheelMat);
                bench.position.set(-0.1, 0.5, 0);
                threeVehicleGroup.add(bench);

                const backrestGeo = new THREE.BoxGeometry(0.08, 0.35, 0.75);
                const backrest = new THREE.Mesh(backrestGeo, wheelMat);
                backrest.position.set(-0.24, 0.8, 0);
                threeVehicleGroup.add(backrest);

                // Roof pillars (4 thin cylinders)
                const pillarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
                const p1 = new THREE.Mesh(pillarGeo, chromeMat); p1.position.set(0.25, 0.9, 0.38); threeVehicleGroup.add(p1);
                const p2 = new THREE.Mesh(pillarGeo, chromeMat); p2.position.set(0.25, 0.9, -0.38); threeVehicleGroup.add(p2);
                const p3 = new THREE.Mesh(pillarGeo, chromeMat); p3.position.set(-0.55, 0.9, 0.38); threeVehicleGroup.add(p3);
                const p4 = new THREE.Mesh(pillarGeo, chromeMat); p4.position.set(-0.55, 0.9, -0.38); threeVehicleGroup.add(p4);

                // Roof canopy
                const roofGeo = new THREE.BoxGeometry(1.2, 0.05, 0.9);
                const roof = new THREE.Mesh(roofGeo, bodyMat);
                roof.position.set(-0.15, 1.3, 0);
                threeVehicleGroup.add(roof);

                // Wheels
                const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 16);
                wheelGeo.rotateX(Math.PI / 2);
                const positions = [
                    [0.45, 0.22, 0.42], [0.45, 0.22, -0.42],
                    [-0.45, 0.22, 0.42], [-0.45, 0.22, -0.42]
                ];
                positions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    threeVehicleGroup.add(wheel);
                });

                // Front blue decal for disability icon
                const decalGeo = new THREE.BoxGeometry(0.01, 0.2, 0.2);
                const decalMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 }); // Disability blue
                const decal = new THREE.Mesh(decalGeo, decalMat);
                decal.position.set(0.76, 0.52, 0);
                threeVehicleGroup.add(decal);

            } else if (type === 'heavy') {
                // Heavy Lorry / Truck
                const cabGeo = new THREE.BoxGeometry(1.0, 1.2, 1.1);
                const cab = new THREE.Mesh(cabGeo, bodyMat);
                cab.position.set(1.0, 0.75, 0);
                threeVehicleGroup.add(cab);

                const glassGeo = new THREE.BoxGeometry(0.45, 0.35, 1.02);
                const glass = new THREE.Mesh(glassGeo, glassMat);
                glass.position.set(1.22, 1.0, 0);
                threeVehicleGroup.add(glass);

                const bedGeo = new THREE.BoxGeometry(2.4, 0.9, 1.1);
                const bed = new THREE.Mesh(bedGeo, chromeMat);
                bed.position.set(-0.8, 0.8, 0);
                threeVehicleGroup.add(bed);

                const chassisGeo = new THREE.BoxGeometry(3.6, 0.25, 0.95);
                const chassis = new THREE.Mesh(chassisGeo, wheelMat);
                chassis.position.y = 0.25;
                threeVehicleGroup.add(chassis);

                const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.26, 16);
                wheelGeo.rotateX(Math.PI / 2);

                const wheelPos = [
                    [1.0, 0.32, 0.52], [1.0, 0.32, -0.52],
                    [-0.3, 0.32, 0.52], [-0.3, 0.32, -0.52],
                    [-1.1, 0.32, 0.52], [-1.1, 0.32, -0.52]
                ];
                wheelPos.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    threeVehicleGroup.add(wheel);
                });
            }
        }

        function bookUserParkingSlot(templeKey, zoneIdx) {
            const selectEl = document.getElementById('parking-temple-select');
            if (selectEl) {
                selectEl.value = templeKey;
                selectEl.dispatchEvent(new Event('change'));
            }
            
            setTimeout(() => {
                switchParkingFloor(zoneIdx);
                const mapSection = document.getElementById('parking-map-container');
                if (mapSection) {
                    mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                initThreeJsVehicleRenderer();
            }, 120);
        }

        function switchParkingFloor(idx) {
            currentParkingZoneIdx = idx;
            clearParkingSelection();
        }



        // ===== SLOT HOLD TIMER SYSTEM =====
        let slotHoldInterval = null;
        let slotHoldSecondsRemaining = 300;

        function startSlotHoldTimer(zoneName, fee) {
            if (slotHoldInterval) clearInterval(slotHoldInterval);
            slotHoldSecondsRemaining = 300; // 5 minutes
            
            const timerUpdate = () => {
                const min = Math.floor(slotHoldSecondsRemaining / 60).toString().padStart(2, '0');
                const sec = (slotHoldSecondsRemaining % 60).toString().padStart(2, '0');
                
                const timerEl = document.getElementById('selected-spot-timer');
                if (timerEl) {
                    timerEl.innerText = `${min}:${sec}`;
                }
                
                if (slotHoldSecondsRemaining <= 0) {
                    clearInterval(slotHoldInterval);
                    releaseExpiredSlotHold();
                }
                slotHoldSecondsRemaining--;
            };
            
            timerUpdate();
            slotHoldInterval = setInterval(timerUpdate, 1000);
        }

        // ===== HIGH FIDELITY UNIFIED CHECKOUT CONTROLLERS =====
        let sidebarPaymentMethod = 'visa';
        
        function selectSidebarPaymentMethod(method) {
            sidebarPaymentMethod = method;
            const visaBtn = document.getElementById('pay-sidebar-visa');
            const walletBtn = document.getElementById('pay-sidebar-wallet');
            const visaCheck = document.getElementById('pay-sidebar-visa-check');
            const walletCheck = document.getElementById('pay-sidebar-wallet-check');

            if (method === 'visa') {
                if (visaBtn) {
                    visaBtn.className = "pay-method-sidebar-btn flex justify-between items-center p-3.5 bg-white border-2 border-primary rounded-2xl cursor-pointer hover:shadow-sm transition-all";
                    const innerFlex = visaBtn.querySelector('.flex');
                    if (innerFlex) innerFlex.classList.remove('opacity-70');
                }
                if (walletBtn) {
                    walletBtn.className = "pay-method-sidebar-btn flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all";
                    const innerFlex = walletBtn.querySelector('.flex');
                    if (innerFlex) innerFlex.classList.add('opacity-70');
                }
                if (visaCheck) visaCheck.classList.remove('hidden');
                if (walletCheck) walletCheck.classList.add('hidden');
            } else {
                if (walletBtn) {
                    walletBtn.className = "pay-method-sidebar-btn flex justify-between items-center p-3.5 bg-white border-2 border-primary rounded-2xl cursor-pointer hover:shadow-sm transition-all";
                    const innerFlex = walletBtn.querySelector('.flex');
                    if (innerFlex) innerFlex.classList.remove('opacity-70');
                }
                if (visaBtn) {
                    visaBtn.className = "pay-method-sidebar-btn flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all";
                    const innerFlex = visaBtn.querySelector('.flex');
                    if (innerFlex) innerFlex.classList.add('opacity-70');
                }
                if (walletCheck) walletCheck.classList.remove('hidden');
                if (visaCheck) visaCheck.classList.add('hidden');
            }
        }

        function updateSidebarEstimatedEndTime() {
            const endTimeDisplay = document.getElementById('parking-end-time-display');
            if (!endTimeDisplay) return;

            const now = new Date();
            const durationMs = selectedParkingDuration * 60 * 60 * 1000;
            const end = new Date(now.getTime() + durationMs);

            let hrs = end.getHours();
            const mins = end.getMinutes().toString().padStart(2, '0');
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12;
            hrs = hrs ? hrs : 12; // 0 should be 12
            
            endTimeDisplay.innerText = `${hrs}:${mins} ${ampm}`;
        }

        function drawSidebarVehiclePreview(type) {
            const container = document.getElementById('live-vehicle-preview-container');
            if (!container) return;

            // Sleek HSL styled top-down 2D illustrations with micro-animations
            const carSvg = `
                <svg viewBox="0 0 40 80" class="w-9 h-18 drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] animate-[pulse_3s_infinite] transition-transform duration-300">
                    <rect x="1" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="1" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="4" y="6" width="32" height="68" rx="10" fill="#ea580c" />
                    <rect x="6" y="24" width="28" height="32" rx="6" fill="#0f172a" />
                    <path d="M 6 24 L 10 16 L 30 16 L 34 24 Z" fill="#38bdf8" opacity="0.8" />
                    <path d="M 6 56 L 10 62 L 30 62 L 34 56 Z" fill="#38bdf8" opacity="0.5" />
                    <polygon points="6,6 12,2 18,6" fill="#fef08a" opacity="0.95" class="animate-pulse" />
                    <polygon points="34,6 28,2 22,6" fill="#fef08a" opacity="0.95" class="animate-pulse" />
                    <rect x="6" y="72" width="6" height="2" rx="1" fill="#ef4444" />
                    <rect x="28" y="72" width="6" height="2" rx="1" fill="#ef4444" />
                </svg>
            `;
            
            const bikeSvg = `
                <svg viewBox="0 0 20 60" class="w-5 h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] animate-[pulse_3s_infinite] transition-transform duration-300">
                    <rect x="8" y="4" width="4" height="12" rx="1" fill="#111" />
                    <rect x="8" y="44" width="4" height="12" rx="1" fill="#111" />
                    <line x1="2" y1="16" x2="18" y2="16" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
                    <circle cx="2" cy="12" r="1.5" fill="#111" />
                    <circle cx="18" cy="12" r="1.5" fill="#111" />
                    <path d="M 6 16 L 14 16 L 13 40 L 7 40 Z" fill="#3b82f6" />
                    <rect x="7" y="24" width="6" height="12" rx="2" fill="#0f172a" />
                    <rect x="7.5" y="32" width="5" height="10" rx="1.5" fill="#111" />
                </svg>
            `;

            const evSvg = `
                <svg viewBox="0 0 40 80" class="w-9 h-18 drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] animate-[pulse_2s_infinite] transition-transform duration-300">
                    <rect x="1" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="1" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="4" y="6" width="32" height="68" rx="10" fill="#0d9488" />
                    <rect x="5" y="7" width="30" height="66" rx="9" fill="none" stroke="#2dd4bf" stroke-width="1.5" stroke-dasharray="3,3" />
                    <rect x="6" y="24" width="28" height="32" rx="6" fill="#0f172a" />
                    <path d="M 6 24 L 10 16 L 30 16 L 34 24 Z" fill="#2dd4bf" opacity="0.8" />
                    <polygon points="6,6 12,2 18,6" fill="#2dd4bf" opacity="0.95" />
                    <polygon points="34,6 28,2 22,6" fill="#2dd4bf" opacity="0.95" />
                    <path d="M 20 28 L 23 35 L 18 35 L 21 42 Z" fill="#2dd4bf" class="animate-bounce" />
                </svg>
            `;

            const disabledSvg = `
                <svg viewBox="0 0 40 80" class="w-9 h-18 drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] animate-[pulse_3s_infinite] transition-transform duration-300">
                    <rect x="1" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="12" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="1" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="56" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="4" y="6" width="32" height="68" rx="10" fill="#1d4ed8" />
                    <rect x="6" y="24" width="28" height="32" rx="6" fill="#0f172a" />
                    <circle cx="20" cy="30" r="3" fill="#fff" />
                    <path d="M 20 33 L 20 40 L 25 43 M 17 37 C 17 37 18 41 22 41 C 26 41 26 37 26 37" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" />
                </svg>
            `;

            const heavySvg = `
                <svg viewBox="0 0 40 80" class="w-9 h-18 drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)] animate-[pulse_4s_infinite] transition-transform duration-300">
                    <rect x="1" y="10" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="10" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="1" y="36" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="36" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="1" y="62" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="33" y="62" width="6" height="12" rx="2" fill="#1e293b" />
                    <rect x="4" y="4" width="32" height="72" rx="4" fill="#1e3a8a" />
                    <rect x="6" y="8" width="28" height="12" rx="2" fill="#38bdf8" opacity="0.8" />
                </svg>
            `;

            let svg = carSvg;
            if (type === 'bike') svg = bikeSvg;
            else if (type === 'ev') svg = evSvg;
            else if (type === 'disabled') svg = disabledSvg;
            else if (type === 'heavy') svg = heavySvg;

            container.innerHTML = svg;
        }

        function clearParkingSelection() {
            selectedSlotId = null;
            selectedSlotDetails = null;
            const panel = document.getElementById('parking-booking-panel');
            const ph = document.getElementById('parking-sidebar-placeholder');
            if (panel) panel.classList.add('hidden');
            if (ph) ph.classList.remove('hidden');
            updateParkingView();
        }

        function releaseExpiredSlotHold() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
            } catch(e) {}

            alert("Hold Expired! Your 5-minute parking slot hold has timed out and the slot has been released.");
            clearParkingSelection();
        }

        // ─── Animated Indoor Runway Navigation System (Accuracy Guaranteed) ───
        function drawIndoorRunwayNavigation(slotId) {
            // Remove existing SVG overlay if any
            const existingOverlay = document.getElementById('parking-nav-overlay');
            if (existingOverlay) existingOverlay.remove();
            
            // Remove existing HUD directions if any
            const existingHUD = document.getElementById('parking-nav-hud');
            if (existingHUD) existingHUD.remove();

            if (!slotId) return;

            const slotEl = document.querySelector(`div[data-slot-id="${slotId}"]`);
            const fakeMap = document.getElementById('fake-parking-map');
            if (!slotEl || !fakeMap) return;

            // Ensure relative coordinates
            const slotRect = slotEl.getBoundingClientRect();
            const mapRect = fakeMap.getBoundingClientRect();
            
            // Zoom factor correction if needed (since getBoundingClientRect includes scale)
            const zoom = currentParkingZoom || 1.0;
            
            const slotX = (slotRect.left - mapRect.left) / zoom + (slotRect.width / zoom) / 2;
            const slotY = (slotRect.top - mapRect.top) / zoom + (slotRect.height / zoom) / 2;
            
            // Map dimensions
            const mapW = mapRect.width / zoom;
            const mapH = mapRect.height / zoom;
            
            // Entry Gate coordinate: top center of the entry block
            const entryX = mapW / 2;
            const entryY = 22; // Midpoint of the entry gate block (44px height)

            // Let's create an SVG element matching the size of the fakeMap
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = "parking-nav-overlay";
            svg.style.cssText = `position:absolute;top:0;left:0;width:${mapW}px;height:${mapH}px;pointer-events:none;z-index:20;`;
            svg.setAttribute("viewBox", `0 0 ${mapW} ${mapH}`);

            // Let's compute a neat orthogonal route:
            // 1. Move from Entry Gate (entryX, entryY) down into the Entry Lane (y = 62)
            // 2. Go horizontally in Entry Lane to the target slot column (slotX)
            // 3. Move vertically down to the lane preceding the target slot row
            // 4. Finally, turn and enter the slot (slotX, slotY)
            const pathD = `M ${entryX} ${entryY} L ${entryX} 62 L ${slotX} 62 L ${slotX} ${slotY}`;
            
            // Create a gorgeous glowing route path
            const routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            routePath.setAttribute("d", pathD);
            routePath.setAttribute("stroke", "#10b981");
            routePath.setAttribute("stroke-width", "4.5");
            routePath.setAttribute("stroke-dasharray", "10,8");
            routePath.setAttribute("fill", "none");
            routePath.setAttribute("stroke-linecap", "round");
            routePath.setAttribute("stroke-linejoin", "round");
            routePath.style.cssText = `animation: navPathFlow 1s linear infinite; filter: drop-shadow(0 0 5px #10b981) drop-shadow(0 0 10px #10b981);`;
            
            // Target Pin / Pulsing Ring
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ring.setAttribute("cx", slotX);
            ring.setAttribute("cy", slotY);
            ring.setAttribute("r", "20");
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "#ea580c");
            ring.setAttribute("stroke-width", "3");
            ring.style.cssText = `animation: navTargetPing 1.5s ease-out infinite; transform-origin: ${slotX}px ${slotY}px;`;

            const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            centerDot.setAttribute("cx", slotX);
            centerDot.setAttribute("cy", slotY);
            centerDot.setAttribute("r", "5");
            centerDot.setAttribute("fill", "#ea580c");

            svg.appendChild(routePath);
            svg.appendChild(ring);
            svg.appendChild(centerDot);
            
            fakeMap.appendChild(svg);
            
            // Add custom animation styles to the page if they don't exist
            if (!document.getElementById('parking-nav-styles')) {
                const styles = document.createElement('style');
                styles.id = 'parking-nav-styles';
                styles.innerHTML = `
                    @keyframes navPathFlow {
                        from { stroke-dashoffset: 36; }
                        to { stroke-dashoffset: 0; }
                    }
                    @keyframes navTargetPing {
                        0% { transform: scale(0.6); opacity: 1; stroke-width: 4; }
                        100% { transform: scale(1.6); opacity: 0; stroke-width: 1; }
                    }
                `;
                document.head.appendChild(styles);
            }

            // Create and append the floating Navigation HUD
            const activeSelect = document.getElementById('parking-temple-select');
            const templeKey = activeSelect ? activeSelect.value : 'tirupati';
            const config = TEMPLE_PARKING_CONFIG[templeKey] || {};
            const templeName = config.name || 'Sanctuary';
            
            const hud = document.createElement('div');
            hud.id = 'parking-nav-hud';
            hud.className = 'absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 z-30 select-none animate-[fadeInDown_0.3s_ease-out] font-semibold text-xs min-w-[340px] max-w-[90%]';
            hud.innerHTML = `
                <div class="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/20 text-primary flex-shrink-0 animate-pulse">
                    <span class="material-symbols-outlined text-lg">explore</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[9px] uppercase tracking-wider text-slate-400 font-black">Indoor GPS Route Active</p>
                    <p class="text-slate-200 mt-0.5 truncate font-bold">✓ ENTRY → Main Drive Lane → Row ${slotId.charAt(0)} → Slot ${slotId}</p>
                </div>
                <button onclick="document.getElementById('parking-nav-hud').remove(); document.getElementById('parking-nav-overlay').remove();" class="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `;
            
            // Append HUD inside the scrollable container's parent so it floats on top of the map
            const container = document.getElementById('parking-map-scroll-container').parentElement;
            if (container) container.appendChild(hud);
        }

        function selectUserParkingSlot(id, label, zoneName) {
            selectedSlotId = id;
            selectedSlotDetails = { id, label, zoneName };
            
            document.getElementById('selected-spot-name').innerText = label || id;
            document.getElementById('selected-spot-floor').innerText = zoneName;
            
            const el = document.getElementById('parking-temple-select');
            const templeKey = el ? el.value : 'tirupati';
            
            // Get pricing from new TEMPLE_PARKING_CONFIG first
            const templeConfig = TEMPLE_PARKING_CONFIG[templeKey];
            let hourlyRate = templeConfig?.pricing?.car || 60;
            let activeType = 'car';

            // Find the slot in the generated data
            if (templeConfig) {
                const zoneConfig = templeConfig.zones[currentParkingZoneIdx];
                if (zoneConfig) {
                    const slots = generateTempleZoneSlots(templeKey, currentParkingZoneIdx, zoneConfig);
                    const slot = slots.find(s => s.id === id);
                    if (slot) {
                        activeType = slot.type || 'car';
                        // Resolve the pricing dynamically based on special modifiers
                        hourlyRate = slot.isVIP ? (templeConfig.pricing.vip || 120)
                                   : slot.isEV ? (templeConfig.pricing.ev || 80)
                                   : slot.isDisabled ? 0
                                   : activeType === 'bike' ? (templeConfig.pricing.bike || 25)
                                   : (templeConfig.pricing.car || 60);
                    }
                }
            } else {
                // Fallback: try localStorage
                try {
                    const raw = localStorage.getItem('dd_parkingData');
                    const all = raw ? JSON.parse(raw) : {};
                    const zones = all[templeKey]?.zones || [];
                    const zone = zones[currentParkingZoneIdx];
                    const slot = zone?.slots?.find(s => s.id === id);
                    if (slot) {
                        activeType = slot.type || 'car';
                        hourlyRate = slot.isVIP ? 120
                                   : slot.isEV ? 80
                                   : slot.isDisabled ? 0
                                   : activeType === 'bike' ? 20
                                   : 60;
                    }
                } catch(e) {}
            }

            // Set active category button highlight
            const tabs = ['car', 'bike', 'ev', 'disabled', 'heavy'];
            tabs.forEach(t => {
                const btn = document.getElementById(`vtab-${t}`);
                if (btn) {
                    if (t === activeType) {
                        btn.className = "vtab-btn p-2 rounded-xl flex flex-col items-center gap-1 transition-all bg-slate-900 border-2 border-primary shadow-sm text-primary scale-95";
                    } else {
                        btn.className = "vtab-btn p-2 rounded-xl flex flex-col items-center gap-1 transition-all bg-white border border-slate-150 text-slate-500 hover:bg-slate-50";
                    }
                }
            });
            
            // Draw sleek vehicle 2D vector preview
            drawSidebarVehiclePreview(activeType);

            const rateStr = `₹${hourlyRate}/hr`;
            const baseFare = hourlyRate * selectedParkingDuration;
            const grandTotal = baseFare + 10 + (priorityShuttleSelected ? 30 : 0);
            
            // Update UI elements
            const rateEl = document.getElementById('selected-spot-rate');
            if (rateEl) rateEl.innerText = rateStr;
            
            const summaryDurEl = document.getElementById('summary-duration');
            if (summaryDurEl) summaryDurEl.innerText = selectedParkingDuration;
            
            const summaryBaseEl = document.getElementById('summary-base-fare');
            if (summaryBaseEl) summaryBaseEl.innerText = `₹${baseFare}`;
            
            const summaryGrandEl = document.getElementById('summary-grand-total');
            if (summaryGrandEl) summaryGrandEl.innerText = `₹${grandTotal}`;
            
            const summaryBtnEl = document.getElementById('summary-btn-total');
            if (summaryBtnEl) summaryBtnEl.innerText = `₹${grandTotal}`;
            
            const timerEl = document.getElementById('selected-spot-timer');
            if (timerEl) {
                timerEl.className = "text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 animate-pulse";
            }

            // Sync dynamic estimated exit times
            updateSidebarEstimatedEndTime();

            // Toggle Sidebar panels smoothly
            const ph = document.getElementById('parking-sidebar-placeholder');
            const panel = document.getElementById('parking-booking-panel');
            if (ph) ph.classList.add('hidden');
            if (panel) panel.classList.remove('hidden');
            
            startSlotHoldTimer(zoneName, rateStr);
            updateParkingView();

            // Draw GPS interior guidance path directly after grid re-render!
            setTimeout(() => {
                drawIndoorRunwayNavigation(id);
            }, 100);
        }

        let parkingCheckoutState = null;

        function openParkingCheckoutModal(slot, zone, templeKey) {
            let hourlyRate = 60;
            if (slot.type === 'bike') {
                hourlyRate = 20;
            } else if (slot.type === 'ev' || slot.status === 'ev') {
                hourlyRate = 80;
            }
            
            const baseFare = hourlyRate * selectedParkingDuration;
            const fee = baseFare + 10 + (priorityShuttleSelected ? 30 : 0);
            
            parkingCheckoutState = {
                slot,
                zone,
                templeKey,
                fee
            };
            
            const displayAmt = '₹' + fee;
            let templeName = 'Temple';
            try {
                const raw = localStorage.getItem('dd_parkingData');
                const all = raw ? JSON.parse(raw) : {};
                templeName = all[templeKey]?.name || 'Temple';
            } catch(e) {}
            
            document.getElementById('pay-amount').innerText = displayAmt;
            document.getElementById('pay-temple').innerText = templeName;
            document.getElementById('pay-ticket-type').innerText = `Parking Slot ${slot.id} · ${slot.type.toUpperCase()} · ${selectedParkingDuration} Hours${priorityShuttleSelected ? ' · Shuttle Pass' : ''}`;
            
            document.getElementById('payment-modal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function confirmSelectedParkingSlot() {
            if (!selectedSlotId) return;
            
            const el = document.getElementById('parking-temple-select');
            const templeKey = el ? el.value : 'tirupati';

            // First try localStorage; fall back to dynamically generated slots
            const config = TEMPLE_PARKING_CONFIG[templeKey];
            let slot = null;
            let zone = null;

            if (config && config.zones && config.zones[currentParkingZoneIdx]) {
                zone = config.zones[currentParkingZoneIdx];
                const slots = generateTempleZoneSlots(templeKey, currentParkingZoneIdx, zone);
                slot = slots.find(s => s.id === selectedSlotId);
            }

            // Fallback: localStorage
            if (!slot) {
                try {
                    const raw = localStorage.getItem('dd_parkingData');
                    const all = raw ? JSON.parse(raw) : {};
                    const lsZones = all[templeKey]?.zones || [];
                    zone = lsZones[currentParkingZoneIdx];
                    slot = zone?.slots?.find(s => s.id === selectedSlotId);
                } catch(e) {}
            }

            if (!slot) return;
            openParkingCheckoutModal(slot, zone, templeKey);
        }

        function showParkingReceiptModal(slotLabel, zoneName, templeKey) {
            // Play a premium synthetic dual-tone success chime
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(audioCtx.destination);
                
                // Beautiful ascending C5 to E5 synthetic chime
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(659.26, audioCtx.currentTime + 0.08); // E5
                
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
                
                osc1.start(); osc1.stop(audioCtx.currentTime + 0.3);
                osc2.start(); osc2.stop(audioCtx.currentTime + 0.38);
            } catch(e) {}

            let templeName = 'Temple';
            try {
                const raw = localStorage.getItem('dd_parkingData');
                const all = raw ? JSON.parse(raw) : {};
                templeName = all[templeKey]?.name || 'Temple';
            } catch(e) {}
            
            const bookingId = 'PKG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const modalId = 'parking-receipt-modal';
            let modalEl = document.getElementById(modalId);
            if (modalEl) modalEl.remove();
            
            modalEl = document.createElement('div');
            modalEl.id = modalId;
            modalEl.className = 'fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm opacity-0 transition-opacity duration-300';
            
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingId + '|' + slotLabel + '|' + templeName)}`;
            
            modalEl.innerHTML = `
                <div class="bg-white max-w-sm w-full rounded-[36px] overflow-hidden border border-slate-200 shadow-2xl transform scale-95 transition-all duration-300 relative select-none">
                    
                    <!-- Top stub header -->
                    <div class="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-6 text-white text-center relative">
                        <div class="absolute top-4 right-4 cursor-pointer hover:scale-110 transition-transform" onclick="closeParkingReceiptModal()">
                            <span class="material-symbols-outlined text-white/95 hover:text-white">close</span>
                        </div>
                        <span class="material-symbols-outlined text-4xl mb-1 animate-bounce">local_parking</span>
                        <h3 class="font-manrope font-extrabold text-base tracking-wide">SACRED PARKING PASS</h3>
                        <p class="text-[9px] tracking-wider uppercase opacity-85 mt-0.5">Sanctuary Grid E-Pass</p>
                    </div>
                    
                    <!-- Ticket Main Body -->
                    <div class="p-6 flex flex-col items-center relative bg-white">
                        <!-- Left and Right Notch cut-outs to simulate physical ticket stub -->
                        <div class="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-950/80 border-r border-slate-700/20"></div>
                        <div class="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-950/80 border-l border-slate-700/20"></div>
                        
                        <!-- Pulse active status badge -->
                        <span class="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest mb-4 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> ✓ Active Pass
                        </span>

                        <!-- Dynamic QR Code -->
                        <div class="w-40 h-40 bg-white border border-slate-100 rounded-2xl p-2 shadow-sm flex items-center justify-center mb-5 hover:scale-102 transition-transform">
                            <img src="${qrUrl}" alt="Pass QR" class="w-full h-full object-contain" />
                        </div>
                        
                        <!-- Details Grid -->
                        <div class="w-full flex flex-col gap-2.5 border-b border-dashed border-slate-200 pb-4 mb-4 text-xs font-semibold text-slate-500">
                            <div class="flex justify-between">
                                <span class="uppercase text-slate-400">SANCTUARY:</span>
                                <span class="text-slate-800 font-extrabold text-right">${templeName}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="uppercase text-slate-400">ZONE/LEVEL:</span>
                                <span class="text-slate-800 font-extrabold text-right">${zoneName}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="uppercase text-slate-400">VEHICLE SLOT:</span>
                                <span class="text-primary font-black text-right text-sm tracking-wide bg-orange-50 px-2 py-0.5 rounded border border-primary/10">${slotLabel}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="uppercase text-slate-400">DURATION:</span>
                                <span class="text-slate-800 font-extrabold text-right">${selectedParkingDuration} Hours</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="uppercase text-slate-400">PASS ID:</span>
                                <span class="text-slate-800 font-mono font-extrabold text-right">${bookingId}</span>
                            </div>
                        </div>

                        <!-- Barcode visualization -->
                        <div class="w-full flex flex-col items-center gap-1 mb-5">
                            <svg viewBox="0 0 100 20" class="w-[85%] h-8 opacity-75">
                                <rect x="2" width="1.8" height="20" fill="#1e293b" />
                                <rect x="6" width="0.8" height="20" fill="#1e293b" />
                                <rect x="8.5" width="2.5" height="20" fill="#1e293b" />
                                <rect x="13" width="1.8" height="20" fill="#1e293b" />
                                <rect x="17" width="0.8" height="20" fill="#1e293b" />
                                <rect x="19" width="3.5" height="20" fill="#1e293b" />
                                <rect x="25" width="0.8" height="20" fill="#1e293b" />
                                <rect x="28" width="1.8" height="20" fill="#1e293b" />
                                <rect x="32" width="2.8" height="20" fill="#1e293b" />
                                <rect x="37" width="0.8" height="20" fill="#1e293b" />
                                <rect x="40" width="1.8" height="20" fill="#1e293b" />
                                <rect x="44" width="3.8" height="20" fill="#1e293b" />
                                <rect x="50" width="0.8" height="20" fill="#1e293b" />
                                <rect x="53" width="2.8" height="20" fill="#1e293b" />
                                <rect x="58" width="1.8" height="20" fill="#1e293b" />
                                <rect x="62" width="0.8" height="20" fill="#1e293b" />
                                <rect x="65" width="3.8" height="20" fill="#1e293b" />
                                <rect x="71" width="1.8" height="20" fill="#1e293b" />
                                <rect x="75" width="0.8" height="20" fill="#1e293b" />
                                <rect x="78" width="2.8" height="20" fill="#1e293b" />
                                <rect x="83" width="1.8" height="20" fill="#1e293b" />
                                <rect x="87" width="0.8" height="20" fill="#1e293b" />
                                <rect x="90" width="3.8" height="20" fill="#1e293b" />
                                <rect x="95" width="1.8" height="20" fill="#1e293b" />
                            </svg>
                            <span class="text-[8px] font-mono font-bold tracking-[0.2em] text-slate-400">${bookingId}</span>
                        </div>
                        
                        <!-- Action Navigation Buttons -->
                        <div class="w-full flex flex-col gap-2">
                            <a href="https://maps.google.com/?q=${encodeURIComponent(templeName + ' ' + zoneName)}" target="_blank" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-slate-800 hover:shadow-md transition-all">
                                <span class="material-symbols-outlined text-[16px]">navigation</span>
                                Navigate to Parking Lot
                            </a>
                            <button onclick="closeParkingReceiptModal()" class="w-full px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all cursor-pointer">
                                Dismiss E-Pass
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalEl);
            setTimeout(() => {
                modalEl.classList.remove('opacity-0');
                modalEl.querySelector('.transform').classList.remove('scale-95');
            }, 50);
        }

        function closeParkingReceiptModal() {
            const modal = document.getElementById('parking-receipt-modal');
            if (modal) {
                modal.classList.add('opacity-0');
                modal.querySelector('.transform').classList.add('scale-95');
                setTimeout(() => modal.remove(), 300);
            }
            clearParkingSelection();
        }

        // ===== INTERACTIVE PARKING STATES & FUNCTIONS =====
        let selectedParkingDuration = 2; // Default 2 hours
        let priorityShuttleSelected = false;
        let activeSearchQuery = '';
        let activeQuickFilter = 'all'; // 'all', 'available', 'ev', 'disabled'

        function selectVisualParkingTemple(templeKey) {
            // Reset zone to first level for new temple
            currentParkingZoneIdx = 0;
            selectedSlotId = null;
            selectedSlotDetails = null;

            // Sync legacy select dropdown
            const selectEl = document.getElementById('parking-temple-select');
            if (selectEl) {
                selectEl.value = templeKey;
            }
            
            updateParkingView();

            // Smooth scroll to the map section
            setTimeout(() => {
                const mapSection = document.getElementById('parking-map-container');
                if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }


        function selectParkingDuration(hours, btn) {
            selectedParkingDuration = hours;
            document.querySelectorAll('.duration-chip').forEach(b => {
                b.className = 'duration-chip px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all';
            });
            btn.className = 'duration-chip px-4 py-2 bg-[#FFF3E0] text-[#E65100] border border-primary/20 rounded-xl text-xs font-bold shadow-sm transition-all';
            
            // Recalculate totals in checkout if spot is selected
            if (selectedSlotId && selectedSlotDetails) {
                const el = document.getElementById('parking-temple-select');
                const templeKey = el ? el.value : 'tirupati';
                // Get zone name from config (dynamic) or localStorage fallback
                let zoneName = selectedSlotDetails.zoneName || 'Zone';
                const config = TEMPLE_PARKING_CONFIG[templeKey];
                if (config && config.zones && config.zones[currentParkingZoneIdx]) {
                    zoneName = config.zones[currentParkingZoneIdx].name;
                } else {
                    try {
                        const all = JSON.parse(localStorage.getItem('dd_parkingData')) || {};
                        zoneName = all[templeKey]?.zones?.[currentParkingZoneIdx]?.name || zoneName;
                    } catch(e) {}
                }
                selectUserParkingSlot(selectedSlotId, selectedSlotDetails.label, zoneName);
            }
        }

        function togglePriorityShuttleAddon() {
            priorityShuttleSelected = document.getElementById('shuttle-priority-addon')?.checked || false;
            
            // Recalculate totals
            if (selectedSlotId && selectedSlotDetails) {
                const el = document.getElementById('parking-temple-select');
                const templeKey = el ? el.value : 'tirupati';
                // Get zone name from config (dynamic) or localStorage fallback
                let zoneName = selectedSlotDetails.zoneName || 'Zone';
                const config = TEMPLE_PARKING_CONFIG[templeKey];
                if (config && config.zones && config.zones[currentParkingZoneIdx]) {
                    zoneName = config.zones[currentParkingZoneIdx].name;
                } else {
                    try {
                        const all = JSON.parse(localStorage.getItem('dd_parkingData')) || {};
                        zoneName = all[templeKey]?.zones?.[currentParkingZoneIdx]?.name || zoneName;
                    } catch(e) {}
                }
                selectUserParkingSlot(selectedSlotId, selectedSlotDetails.label, zoneName);
            }
        }

        function filterParkingSlots() {
            activeSearchQuery = document.getElementById('parking-slot-search')?.value.trim().toUpperCase() || '';
            updateParkingView();
        }

        function quickFilterSlots(filterType) {
            activeQuickFilter = filterType;
            document.querySelectorAll('.qf-btn').forEach(btn => {
                btn.className = 'qf-btn px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black transition-all';
            });
            const activeBtn = document.getElementById(`qf-${filterType}`);
            if (activeBtn) {
                activeBtn.className = 'qf-btn px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black transition-all';
            }
            updateParkingView();
        }

        let routeAnimFrame = null;
        function animateParkingRoute(canvasId, templeName) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight;
            
            let progress = 0;
            
            function draw() {
                if (!canvas || !canvas.isConnected) return;
                ctx.clearRect(0, 0, w, h);
                
                // Background grid lines — warm light tone
                ctx.strokeStyle = 'rgba(251, 146, 60, 0.12)';
                ctx.lineWidth = 1;
                const gridSize = 16;
                for(let x=0; x<w; x+=gridSize) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                }
                for(let y=0; y<h; y+=gridSize) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                }
                
                // Background city blocks — warm amber tones
                ctx.fillStyle = 'rgba(253, 186, 116, 0.22)';
                ctx.beginPath();
                ctx.roundRect(20, 10, 50, 30, 3);
                ctx.roundRect(100, 15, 60, 25, 3);
                ctx.roundRect(w - 90, 10, 70, 40, 3);
                ctx.roundRect(w - 180, h - 45, 80, 25, 3);
                ctx.roundRect(15, h - 40, 70, 25, 3);
                ctx.fill();
                
                // Route Coordinate Vertices
                const points = [
                    {x: 30, y: h - 20}, // YOU
                    {x: 30, y: h - 55},
                    {x: 90, y: h - 55},
                    {x: 90, y: 25},
                    {x: w - 120, y: 25},
                    {x: w - 120, y: h - 25},
                    {x: w - 30, y: h - 25} // PARKING
                ];
                
                // Base inactive path — warm light
                ctx.strokeStyle = 'rgba(251, 146, 60, 0.25)';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                ctx.stroke();
                
                // Glowing animated path overlay
                ctx.strokeStyle = '#ea580c';
                ctx.lineWidth = 3.5;
                ctx.shadowColor = '#ea580c';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                
                let segment = progress * (points.length - 1);
                let idx = Math.floor(segment);
                let subProgress = segment - idx;
                
                for(let i=0; i<=idx; i++) {
                    if (i < points.length) ctx.lineTo(points[i].x, points[i].y);
                }
                if (idx < points.length - 1) {
                    const nextX = points[idx].x + (points[idx+1].x - points[idx].x) * subProgress;
                    const nextY = points[idx].y + (points[idx+1].y - points[idx].y) * subProgress;
                    ctx.lineTo(nextX, nextY);
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // reset shadow
                
                // Pulse User Location
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(points[0].x, points[0].y, 5 + Math.sin(Date.now() * 0.005) * 1.5, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(points[0].x, points[0].y, 2.5, 0, Math.PI*2);
                ctx.fill();
                
                // Pulse Parking Location
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.arc(points[points.length-1].x, points[points.length-1].y, 5 + Math.sin(Date.now() * 0.008) * 1.5, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(points[points.length-1].x, points[points.length-1].y, 2.5, 0, Math.PI*2);
                ctx.fill();
                
                // Labels — warm slate/orange tones
                ctx.fillStyle = '#92400e';
                ctx.font = 'bold 8px Inter';
                ctx.fillText('YOU', points[0].x - 8, points[0].y - 9);
                ctx.fillStyle = '#ea580c';
                ctx.fillText(templeName.split(' ')[0].toUpperCase() + ' PARKING', points[points.length-1].x - 65, points[points.length-1].y - 9);
                
                progress += 0.0025;
                if (progress > 1) progress = 0;
                
                routeAnimFrame = requestAnimationFrame(draw);
            }
            
            if (routeAnimFrame) cancelAnimationFrame(routeAnimFrame);
            draw();
        }


        // ═══════════════════════════════════════════════════════════
        // TEMPLE-SPECIFIC PARKING CONFIGURATIONS
        // ═══════════════════════════════════════════════════════════
        const TEMPLE_PARKING_CONFIG = {
            tirupati: {
                name: 'Sri Venkateswara Temple',
                location: 'Tirumala Hills, Andhra Pradesh',
                accentColor: '#E65100',
                pricing: { car: 80, bike: 25, ev: 100, heavy: 200, disabled: 0 },
                features: ['⚡ EV Charging ×48', '👑 VIP Bays ×60', '📹 CCTV 24/7', '🚌 Divine Shuttle', '♿ Accessible Bays'],
                zones: [
                    {
                        name: 'Zone A · VIP & Executive',
                        rows: ['A', 'B', 'C'], cols: 40,
                        slotConfig: { car: true, ev: [3,7,11,15,19,23,27,31,35,39,43,47,51,55,59], disabled: [1,13,25,37,49], vip: [2,4,14,16,26,28,38,40,50,52], bike: [] },
                        occupiedPct: 0.35, capacity: 120
                    },
                    {
                        name: 'Zone B · Main Car Park',
                        rows: ['D','E','F','G'], cols: 50,
                        slotConfig: { car: true, ev: [5,15,25,35,45,55,65,75,85,95], disabled: [1,21,41,61,81], vip: [], bike: [] },
                        occupiedPct: 0.62, capacity: 200
                    },
                    {
                        name: 'Zone C · Two-Wheeler Bay',
                        rows: ['H','I','J','K'], cols: 50,
                        slotConfig: { car: false, ev: [], disabled: [1,25,49,73], vip: [], bike: 'all' },
                        occupiedPct: 0.48, capacity: 200
                    },
                    {
                        name: 'Zone D · EV Charging Hub',
                        rows: ['L','M'], cols: 30,
                        slotConfig: { car: false, ev: 'all', disabled: [1,11,21], vip: [], bike: [] },
                        occupiedPct: 0.58, capacity: 60
                    }
                ]
            },
            manjunatha: {
                name: 'Dharmasthala Manjunatha',
                location: 'Dharmasthala, Karnataka',
                accentColor: '#7C3AED',
                pricing: { car: 60, bike: 20, ev: 80, heavy: 150, disabled: 0 },
                features: ['🌊 River View Parking', '♿ Accessible', '🚌 Pilgrim Shuttle', '📹 CCTV Security'],
                zones: [
                    {
                        name: 'Lot P1 · River Bank',
                        rows: ['A','B','C','D'], cols: 45,
                        slotConfig: { car: true, ev: [4,9,14,19,24,29,34,39,44], disabled: [1,16,31,46], vip: [2,3,12,13,22,23], bike: [] },
                        occupiedPct: 0.82, capacity: 180
                    },
                    {
                        name: 'Lot P2 · Temple Entrance',
                        rows: ['E','F','G','H'], cols: 45,
                        slotConfig: { car: true, ev: [3,9,15,21,27,33,39], disabled: [1,13,25,37], vip: [2,14,26,38], bike: [10,11,22,23,34,35] },
                        occupiedPct: 0.91, capacity: 180
                    },
                    {
                        name: 'Lot P3 · Pilgrim Bike Bay',
                        rows: ['I','J','K'], cols: 50,
                        slotConfig: { car: false, ev: [], disabled: [1,21,41], vip: [], bike: 'all' },
                        occupiedPct: 0.55, capacity: 150
                    }
                ]
            },
            krishna: {
                name: 'Udupi Sri Krishna Mutt',
                location: 'Udupi, Karnataka',
                accentColor: '#0D9488',
                pricing: { car: 70, bike: 25, ev: 90, heavy: 160, disabled: 0 },
                features: ['⚡ EV Zone ×40', '🅿️ Basement + Surface', '♿ Priority Access', '🔒 24/7 Secure'],
                zones: [
                    {
                        name: 'Basement B1 · Car Park',
                        rows: ['A','B','C','D','E'], cols: 50,
                        slotConfig: { car: true, ev: [3,6,9,12,15,18,21,24,27,30], disabled: [1,13,25,37,49], vip: [], bike: [] },
                        occupiedPct: 0.55, capacity: 250
                    },
                    {
                        name: 'Surface S1 · Mixed Zone',
                        rows: ['F','G','H','I','J'], cols: 52,
                        slotConfig: { car: true, ev: [5,10,15,20,25,30], disabled: [1,11,21,31,41,51], vip: [2], bike: [6,7,8,16,17,18,26,27,28,36,37,38,46,47,48] },
                        occupiedPct: 0.42, capacity: 260
                    }
                ]
            },
            kukke: {
                name: 'Kukke Subramanya Temple',
                location: 'Subramanya, Karnataka',
                accentColor: '#059669',
                pricing: { car: 50, bike: 15, ev: 70, heavy: 120, disabled: 0 },
                features: ['🌲 Forest Adjacent', '🏞️ Scenic View', '🚌 Temple Bus Stop', '♿ Accessible'],
                zones: [
                    {
                        name: 'Main Forest Lot',
                        rows: ['A','B','C','D','E'], cols: 45,
                        slotConfig: { car: true, ev: [4,8,12,16,20,24,28,32], disabled: [1,13,25,37,49], vip: [], bike: [] },
                        occupiedPct: 0.72, capacity: 225
                    },
                    {
                        name: 'River Side P2',
                        rows: ['F','G','H'], cols: 50,
                        slotConfig: { car: true, ev: [5,10,15,20,25], disabled: [1,11,21,31,41], vip: [], bike: [3,4,13,14,23,24,33,34] },
                        occupiedPct: 0.32, capacity: 150
                    },
                    {
                        name: 'Pilgrim Bike Bay',
                        rows: ['I','J','K'], cols: 50,
                        slotConfig: { car: false, ev: [], disabled: [1,21,41], vip: [], bike: 'all' },
                        occupiedPct: 0.5, capacity: 150
                    }
                ]
            }
        };

        // ═══════════════════════════════════════════════════════════
        // ZOOM CONTROLS
        // ═══════════════════════════════════════════════════════════
        let currentParkingZoom = 0.75;

        function zoomParkingMap(delta) {
            currentParkingZoom = Math.min(2.0, Math.max(0.3, currentParkingZoom + delta));
            applyParkingZoom();
        }

        function resetParkingZoom() {
            currentParkingZoom = 0.75;
            applyParkingZoom();
        }

        function applyParkingZoom() {
            const inner = document.getElementById('parking-map-inner');
            if (inner) {
                inner.style.transform = `scale(${currentParkingZoom})`;
                // Set explicit dimensions so the scrollable container knows the full scaled size
                const fakeMap = document.getElementById('fake-parking-map');
                if (fakeMap) {
                    const naturalW = fakeMap.scrollWidth;
                    const naturalH = fakeMap.scrollHeight;
                    inner.style.minWidth = Math.ceil(naturalW * currentParkingZoom) + 'px';
                    inner.style.minHeight = Math.ceil(naturalH * currentParkingZoom) + 'px';
                }
            }
            const disp = document.getElementById('parking-zoom-display');
            if (disp) disp.textContent = Math.round(currentParkingZoom * 100) + '%';
        }

        // ═══════════════════════════════════════════════════════════
        // SLOT GENERATION (seeded per slot ID for consistency)
        // ═══════════════════════════════════════════════════════════
        function seededRand(seed) {
            const x = Math.sin(seed + 1) * 10000;
            return x - Math.floor(x);
        }

        function generateTempleZoneSlots(templeKey, zoneIdx, zoneConfig) {
            // Check localStorage first
            try {
                const raw = localStorage.getItem('dd_parkingData');
                const all = raw ? JSON.parse(raw) : {};
                const stored = all?.[templeKey]?.zones?.[zoneIdx]?.slots;
                if (stored && stored.length > 0) return stored;
            } catch(e) {}

            const slots = [];
            const { rows, cols, slotConfig, occupiedPct } = zoneConfig;
            const { ev, disabled, vip, bike } = slotConfig;
            const seed = templeKey.charCodeAt(0) * 100 + zoneIdx * 37;

            rows.forEach((row, rowIdx) => {
                for (let c = 1; c <= cols; c++) {
                    const pos = rowIdx * cols + c; // 1-based position
                    
                    // Unified physical types: Car or Bike
                    let type = 'car';
                    if (bike === 'all') type = 'bike';
                    else if (Array.isArray(bike) && bike.includes(pos)) type = 'bike';
                    else if (cols >= 30 && (c % 10 === 7 || c % 10 === 8) && rowIdx % 2 === 1) type = 'bike'; // Automatic Bike slots in mixed areas

                    // Boolean modifiers
                    const isEV = ev === 'all' || (Array.isArray(ev) && ev.includes(pos)) || (c % 12 === 0);
                    const isDisabled = (Array.isArray(disabled) && disabled.includes(pos)) || (c % 15 === 1 && rowIdx === 0);
                    const isVIP = (Array.isArray(vip) && vip.includes(pos)) || (c % 15 === 2 && rowIdx === 0);

                    const slotSeed = seed + rowIdx * 1000 + c * 13;
                    const occupied = seededRand(slotSeed) < occupiedPct;

                    slots.push({
                        id: `${row}${String(c).padStart(2,'0')}`,
                        row, col: c, type,
                        status: occupied ? 'occupied' : 'available',
                        label: `${row}-${String(c).padStart(2,'0')}`,
                        isEV,
                        isDisabled,
                        isVIP
                    });
                }
            });
            return slots;
        }

        // ═══════════════════════════════════════════════════════════
        // PRICING BANNER RENDERER
        // ═══════════════════════════════════════════════════════════
        function renderPricingBanner(config) {
            const p = config.pricing;
            const banner = document.getElementById('parking-pricing-banner');
            if (!banner) return;
            banner.innerHTML = `
                <div class="flex flex-wrap gap-2 items-center w-full">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pricing · per hour:</span>
                    <span class="flex items-center gap-1 bg-white border border-orange-200 px-2.5 py-1.5 rounded-xl shadow-sm">
                        <span class="material-symbols-outlined text-[13px] text-orange-500">directions_car</span>
                        <span class="text-[11px] font-black text-slate-700">₹${p.car}</span>
                    </span>
                    <span class="flex items-center gap-1 bg-white border border-violet-200 px-2.5 py-1.5 rounded-xl shadow-sm">
                        <span class="material-symbols-outlined text-[13px] text-violet-500">two_wheeler</span>
                        <span class="text-[11px] font-black text-slate-700">₹${p.bike}</span>
                    </span>
                    <span class="flex items-center gap-1 bg-white border border-emerald-200 px-2.5 py-1.5 rounded-xl shadow-sm">
                        <span class="material-symbols-outlined text-[13px] text-emerald-500">electric_car</span>
                        <span class="text-[11px] font-black text-slate-700">₹${p.ev}</span>
                    </span>
                    ${p.heavy ? `<span class="flex items-center gap-1 bg-white border border-blue-200 px-2.5 py-1.5 rounded-xl shadow-sm">
                        <span class="material-symbols-outlined text-[13px] text-blue-500">local_shipping</span>
                        <span class="text-[11px] font-black text-slate-700">₹${p.heavy}</span>
                    </span>` : ''}
                    <div class="ml-auto flex flex-wrap gap-1.5">
                        ${config.features.map(f => `<span class="text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full">${f}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        // ═══════════════════════════════════════════════════════════
        // STATS BAR RENDERER
        // ═══════════════════════════════════════════════════════════
        function renderStatsBar(templeKey, zoneIdx, slots) {
            const statsBar = document.getElementById('parking-stats-bar');
            if (!statsBar) return;
            const total = slots.length;
            const available = slots.filter(s => s.status === 'available').length;
            const occupied = total - available;
            const evSlots = slots.filter(s => s.isEV).length;
            const bikeSlots = slots.filter(s => s.type === 'bike').length;
            const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
            const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f97316' : '#10b981';

            statsBar.innerHTML = `
                <div class="bg-white border border-emerald-100 rounded-2xl p-3 flex flex-col gap-1 shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Available</span>
                    <span class="text-2xl font-black text-emerald-600">${available}</span>
                    <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div style="width:${100 - pct}%;background:#10b981;" class="h-full rounded-full transition-all"></div></div>
                </div>
                <div class="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-1 shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Occupied</span>
                    <span class="text-2xl font-black text-slate-600">${occupied}</span>
                    <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div style="width:${pct}%;background:${barColor};" class="h-full rounded-full transition-all"></div></div>
                </div>
                <div class="bg-white border border-emerald-100 rounded-2xl p-3 flex flex-col gap-1 shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">EV Slots</span>
                    <span class="text-2xl font-black text-emerald-500">⚡${evSlots}</span>
                    <div class="text-[9px] text-slate-400">Available for charging</div>
                </div>
                <div class="bg-white border border-violet-100 rounded-2xl p-3 flex flex-col gap-1 shadow-sm">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bike Bays</span>
                    <span class="text-2xl font-black text-violet-500">🏍${bikeSlots}</span>
                    <div class="text-[9px] text-slate-400">Two-wheeler slots</div>
                </div>
            `;
        }

        // ═══════════════════════════════════════════════════════════
        // DYNAMIC PARKING DROPDOWN POPULATOR (replaces obsolete visual card hub)
        // ═══════════════════════════════════════════════════════════
        function populateParkingTempleDropdown() {
            const selectEl = document.getElementById('parking-temple-select');
            if (!selectEl) return;

            const activeKey = selectEl.value || 'tirupati';

            // Load registered temples
            let registered = [];
            try {
                const payload = localStorage.getItem('dd-registered-temples');
                if (payload) {
                    registered = normalizeTemples(JSON.parse(payload)) || [];
                }
            } catch(e) {}

            let optionsHtml = `
                <option value="tirupati">🕌 Sri Venkateswara Swamy Temple (Tirumala Hills, AP)</option>
                <option value="manjunatha">🛕 Dharmasthala Manjunatha Temple (Dharmasthala, KA)</option>
                <option value="krishna">🕌 Udupi Sri Krishna Mutt (Udupi, KA)</option>
                <option value="kukke">🛕 Kukke Subramanya Temple (Subramanya, KA)</option>
            `;

            registered.forEach(t => {
                const key = t.slug;
                optionsHtml += `<option value="${key}">🕌 ${t.temple_name || t.name} (${t.city || 'India'}, ${t.state || ''}) [Live Partner]</option>`;
            });

            selectEl.innerHTML = optionsHtml;
            selectEl.value = activeKey;
        }

        // ═══════════════════════════════════════════════════════════
        // FULL PARKING MAP RENDERER — Entry Gate → Drive Lanes → Rows → Exit Gate
        // ═══════════════════════════════════════════════════════════
        function renderFullParkingMap(templeKey, zoneIdx) {
            const fakeMap = document.getElementById('fake-parking-map');
            if (!fakeMap) return;

            let config = TEMPLE_PARKING_CONFIG[templeKey];
            let zones = [];
            
            if (config) {
                zones = config.zones;
            } else if (templeKey) {
                // Registered temple dynamic lookup
                try {
                    const raw = localStorage.getItem('dd_parkingData');
                    const all = raw ? JSON.parse(raw) : {};
                    const registeredData = all[templeKey];
                    if (registeredData) {
                        config = {
                            name: registeredData.name,
                            location: 'Partner Sanctuary',
                            accentColor: '#4f46e5',
                            pricing: { car: 60, bike: 20, ev: 80, heavy: 150, disabled: 0 },
                            features: ['⚡ EV Charger', '♿ Priority Access', '📹 Secure 24/7'],
                            zones: registeredData.zones || []
                        };
                        zones = config.zones;
                    }
                } catch(e) {}
            }

            if (!config || !zones || zones.length === 0) return;
            if (zoneIdx >= zones.length) zoneIdx = 0;
            const zoneConfig = zones[zoneIdx];

            const slots = generateTempleZoneSlots(templeKey, zoneIdx, zoneConfig);
            renderStatsBar(templeKey, zoneIdx, slots);

            const { rows, cols } = zoneConfig;
            const slotW = 76; // px per slot
            const slotH = 96; // px per slot
            const gap = 4;
            const totalWidth = cols * (slotW + gap) + 32;
            let html = '';

            // Apply unique visuals based on temple selected
            let mapBg = 'linear-gradient(135deg,#FFFBF5 0%,#FFF8EE 60%,#FFF0D9 100%)';
            let mapBorder = '2px solid #fed7aa';
            let entryGateStyle = 'background:linear-gradient(90deg,#FFF3E0,#FFE0B2,#FFF3E0); border:2px solid #fb923c; color:#92400e;';
            let exitGateStyle = 'background:linear-gradient(90deg,#F0FDF4,#DCFCE7,#F0FDF4); border:2px solid #86efac; color:#15803d;';
            let laneStyle = 'background:linear-gradient(90deg,#FFF8F0,#FDEBC8,#FFF8F0); border-top:2px dashed #fed7aa; border-bottom:2px dashed #fed7aa; color:#c2410c;';
            let rowLabelStyle = 'background:#FFF3E0; border:1px solid #fed7aa; color:#ea580c;';

            if (templeKey === 'tirupati') {
                mapBg = 'linear-gradient(135deg, #FFFDF0 0%, #FFFBE3 60%, #FEF8C9 100%)';
                mapBorder = '3px solid #fbbf24';
                entryGateStyle = 'background:linear-gradient(90deg,#FEF3C7,#FDE68A,#FEF3C7); border:2px solid #f59e0b; color:#92400e; box-shadow: 0 4px 12px rgba(245,158,11,0.15);';
                laneStyle = 'background:linear-gradient(90deg,#FEFDF0,#FEF3C7,#FEFDF0); border-top:2.5px dashed #f59e0b; border-bottom:2.5px dashed #f59e0b; color:#b45309;';
                rowLabelStyle = 'background:#FEF3C7; border:1.5px solid #fde68a; color:#d97706; font-weight:900;';
            } else if (templeKey === 'manjunatha') {
                mapBg = 'linear-gradient(135deg, #F9F5FF 0%, #F4EBFF 60%, #E8D5FF 100%)';
                mapBorder = '3px solid #c084fc';
                entryGateStyle = 'background:linear-gradient(90deg,#F3E8FF,#E9D5FF,#F3E8FF); border:2px solid #a855f7; color:#6b21a8;';
                laneStyle = 'background:linear-gradient(90deg,#FAF5FF,#F3E8FF,#FAF5FF); border-top:2.5px dashed #a855f7; border-bottom:2.5px dashed #a855f7; color:#7e22ce;';
                rowLabelStyle = 'background:#F3E8FF; border:1.5px solid #e9d5ff; color:#8b5cf6;';
            } else if (templeKey === 'krishna') {
                mapBg = 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 60%, #99F6E4 100%)';
                mapBorder = '3px solid #2dd4bf';
                entryGateStyle = 'background:linear-gradient(90deg,#E6FFFA,#CCFBF1,#E6FFFA); border:2px solid #0d9488; color:#115e59;';
                laneStyle = 'background:linear-gradient(90deg,#F0FDFA,#CCFBF1,#F0FDFA); border-top:2.5px dashed #0d9488; border-bottom:2.5px dashed #0d9488; color:#0f766e;';
                rowLabelStyle = 'background:#CCFBF1; border:1.5px solid #99f6e4; color:#0d9488;';
            } else if (templeKey === 'kukke') {
                mapBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 60%, #BBF7D0 100%)';
                mapBorder = '3px solid #4ade80';
                entryGateStyle = 'background:linear-gradient(90deg,#E8FDF0,#DCFCE7,#E8FDF0); border:2px solid #16a34a; color:#14532d;';
                laneStyle = 'background:linear-gradient(90deg,#F0FDF4,#DCFCE7,#F0FDF4); border-top:2.5px dashed #16a34a; border-bottom:2.5px dashed #16a34a; color:#15803d;';
                rowLabelStyle = 'background:#DCFCE7; border:1.5px solid #bbf7d0; color:#16a34a;';
            } else {
                mapBg = 'linear-gradient(135deg, #EEF2F6 0%, #E2E8F0 60%, #CBD5E1 100%)';
                mapBorder = '3px solid #94a3b8';
                entryGateStyle = 'background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9); border:2px solid #64748b; color:#334155;';
                laneStyle = 'background:linear-gradient(90deg,#F8FAFC,#E2E8F0,#F8FAFC); border-top:2.5px dashed #64748b; border-bottom:2.5px dashed #64748b; color:#475569;';
                rowLabelStyle = 'background:#E2E8F0; border:1.5px solid #cbd5e1; color:#64748b;';
            }

            // Style parent container dynamically
            const mapOuter = fakeMap.parentElement?.parentElement;
            if (mapOuter) {
                mapOuter.style.background = mapBg;
                mapOuter.style.borderColor = templeKey === 'tirupati' ? '#f59e0b' : (templeKey === 'manjunatha' ? '#a855f7' : (templeKey === 'krishna' ? '#0d9488' : (templeKey === 'kukke' ? '#16a34a' : '#64748b')));
            }

            // ─── KUKKE SPECIAL BORDER ─────────────────────────────
            if (templeKey === 'kukke') {
                html += `
                    <div style="width:${totalWidth}px; height:24px; background:#14532d; border-radius:16px 16px 0 0; display:flex; align-items:center; justify-content:center; margin-bottom:2px;">
                        <span style="font-size:8px;font-weight:900;color:#86efac;letter-spacing:0.2em;text-transform:uppercase;">🌲 SUBRAMANYA FOREST RESERVE BORDER</span>
                    </div>
                `;
            }

            // ─── ENTRY GATE ───────────────────────────────────────
            html += `
                <div style="width:${totalWidth}px; height:44px; ${entryGateStyle} border-radius:16px 16px 0 0; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:2px; position:relative;">
                    <div style="position:absolute;left:16px;display:flex;align-items:center;gap:6px;">
                        <div style="width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;animation:pulse 1.5s infinite;"></div>
                        <span style="font-size:9px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">ENTRY</span>
                    </div>
                    <span style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;">⛩ ${zoneConfig.name}</span>
                    <div style="position:absolute;right:16px;font-size:9px;font-weight:900;letter-spacing:0.1em;">↓ DRIVE IN</div>
                </div>
            `;

            // ─── ROWS + DRIVE LANES ───────────────────────────────
            rows.forEach((row, rowIdx) => {
                const rowSlots = slots.filter(s => s.row === row);

                // Drive lane before every row group
                if (rowIdx === 0 || rowIdx % 2 === 0) {
                    const laneLabel = rowIdx === 0 ? 'ENTRY LANE →' : (rowIdx >= rows.length - 1 ? '← EXIT LANE' : '→ THROUGH LANE ←');
                    html += `
                        <div style="width:${totalWidth}px; height:36px; ${laneStyle} display:flex; align-items:center; justify-content:center; gap:8px; position:relative; margin:2px 0;">
                            <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(253,186,116,0.06) 20px,rgba(253,186,116,0.06) 21px);"></div>
                            <span style="font-size:9px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;z-index:1;">🛣 ${laneLabel}</span>
                        </div>
                    `;
                }

                // Row header label + slots
                html += `<div style="display:flex;align-items:stretch;gap:${gap}px;margin-bottom:${gap}px;">`;

                // Row label pill
                html += `
                    <div style="width:28px;min-width:28px;display:flex;align-items:center;justify-content:center;border-radius:12px; ${rowLabelStyle}">
                        <span style="font-size:11px;font-weight:900;writing-mode:vertical-lr;text-orientation:mixed;transform:rotate(180deg);">${row}</span>
                    </div>
                `;

                // Slot cells
                rowSlots.forEach(slot => {
                    html += renderMajesticSlotCell(slot, zoneConfig);
                });

                html += `</div>`;

                // Add drive lane after every 2 rows
                if (rowIdx % 2 === 1 && rowIdx < rows.length - 1) {
                    const isLastGroup = rowIdx >= rows.length - 2;
                    html += `
                        <div style="width:${totalWidth}px; height:36px; ${laneStyle} display:flex; align-items:center; justify-content:center; gap:8px; position:relative; margin:2px 0;">
                            <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(253,186,116,0.06) 20px,rgba(253,186,116,0.06) 21px);"></div>
                            <span style="font-size:9px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;z-index:1;">🛣 ${isLastGroup ? '← EXIT LANE' : '⇄ THROUGH LANE'}</span>
                        </div>
                    `;
                }
            });

            // Final drive lane before exit
            if (rows.length % 2 !== 0) {
                html += `
                    <div style="width:${totalWidth}px; height:36px; ${laneStyle} display:flex; align-items:center; justify-content:center; gap:8px; position:relative; margin:2px 0;">
                        <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent,transparent 20px,rgba(253,186,116,0.06) 20px,rgba(253,186,116,0.06) 21px);"></div>
                        <span style="font-size:9px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;z-index:1;">🛣 ← EXIT LANE</span>
                    </div>
                `;
            }

            // ─── EXIT GATE ────────────────────────────────────────
            html += `
                <div style="width:${totalWidth}px; height:44px; ${exitGateStyle} border-radius:0 0 16px 16px; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:2px; position:relative;">
                    <div style="position:absolute;left:16px;display:flex;align-items:center;gap:6px;">
                        <span style="font-size:9px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;">↑ EXIT</span>
                    </div>
                    <span style="font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">🙏 Safe Journey · Thank You</span>
                    <div style="position:absolute;right:16px;font-size:9px;font-weight:900;letter-spacing:0.1em;">DRIVE OUT ↑</div>
                </div>
            `;

            // ─── DHARMASTHALA RIVERSIDE WATERFRONT BLOCK ──────────
            if (templeKey === 'manjunatha') {
                html += `
                    <div style="width:${totalWidth}px; height:38px; background:linear-gradient(90deg,#0284c7,#38bdf8,#0284c7); border-radius:0 0 16px 16px; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:2px; box-shadow: 0 -2px 10px rgba(2,132,199,0.2);">
                        <span style="font-size:9px;font-weight:900;color:white;letter-spacing:0.18em;text-transform:uppercase;animation:pulse 2s infinite;">🌊 NETRAVATHI RIVER WATERFRONT BLOCK</span>
                    </div>
                `;
            }

            fakeMap.innerHTML = html;
            fakeMap.style.cssText = `display:flex;flex-direction:column;gap:0;width:max-content;`;
            setTimeout(() => applyParkingZoom(), 50);
        }

        function renderMajesticSlotCell(slot, zoneConfig) {
            const isSelected = selectedSlotId === slot.id;
            const templeKey = document.getElementById('parking-temple-select')?.value || 'tirupati';
            let config = TEMPLE_PARKING_CONFIG[templeKey];
            let pricing = { car: 60, bike: 20, ev: 80, heavy: 150, disabled: 0 };
            
            if (config) {
                pricing = config.pricing || pricing;
            } else {
                try {
                    const raw = localStorage.getItem('dd_parkingData');
                    const all = raw ? JSON.parse(raw) : {};
                    const registeredData = all[templeKey];
                    if (registeredData && registeredData.pricing) {
                        pricing = registeredData.pricing;
                    }
                } catch(e) {}
            }
            const price = slot.type === 'bike' ? pricing.bike : slot.isEV ? pricing.ev : pricing.car;

            // ─── UDUPI CONCRETE BASEMENT PILLAR REPLACEMENT ───────
            // Ensure structural pillars are exactly uniform in width and height and have no margins
            if (templeKey === 'krishna' && (slot.col === 4 || slot.col === 8) && (slot.row === 'B' || slot.row === 'C')) {
                return `
                    <div style="width:72px;height:92px;border-radius:14px;background:#cbd5e1;border:2px solid #94a3b8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.1); select-none;" title="Basement Structural Pillar">
                        <span class="material-symbols-outlined text-[20px] text-slate-500">domain</span>
                        <div style="font-size:8px;font-weight:900;color:#64748b;letter-spacing:0.05em;">PILLAR</div>
                    </div>
                `;
            }

            // Filter check (ensure identical size for filtered-out slots)
            if (activeSearchQuery && !slot.id.toLowerCase().includes(activeSearchQuery.toLowerCase())) {
                return `<div style="width:72px;height:92px;opacity:0.08;border-radius:14px;background:#f8fafc;border:2px dashed #cbd5e1;"></div>`;
            }
            if (activeQuickFilter === 'available' && slot.status !== 'available') {
                return `<div style="width:72px;height:92px;opacity:0.08;border-radius:14px;background:#f8fafc;border:2px dashed #cbd5e1;"></div>`;
            }
            if (activeQuickFilter === 'ev' && !slot.isEV) {
                return `<div style="width:72px;height:92px;opacity:0.08;border-radius:14px;background:#f8fafc;border:2px dashed #cbd5e1;"></div>`;
            }
            if (activeQuickFilter === 'bike' && slot.type !== 'bike') {
                return `<div style="width:72px;height:92px;opacity:0.08;border-radius:14px;background:#f8fafc;border:2px dashed #cbd5e1;"></div>`;
            }

            // ─── Frosted Booked/Occupied Slot (Pointer events completely blocked) ───
            if (slot.status === 'occupied') {
                const icon = slot.type === 'bike' ? '🏍' : '🚗';
                return `
                    <div style="width:72px;height:92px;border-radius:14px;background:rgba(241,245,249,0.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:2px solid rgba(203,213,225,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative;opacity:0.55;pointer-events:none;user-select:none;" title="${slot.label} — Booked Space">
                        <div style="position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:#94a3b8;"></div>
                        <div style="font-size:20px;line-height:1;filter:grayscale(100%);opacity:0.35;">${icon}</div>
                        <div style="font-size:9px;font-weight:900;color:#94a3b8;letter-spacing:0.05em;">${slot.id}</div>
                        <div style="font-size:7px;font-weight:800;color:#64748b;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:1px 3px;letter-spacing:0.05em;text-transform:uppercase;line-height:1;">Booked</div>
                    </div>
                `;
            }

            // ─── Available Slot Color & Badge Resolution ───────────
            let borderColor, bgColor, iconColor, icon, labelColor, typeLabel;
            if (slot.isVIP) {
                borderColor = isSelected ? '#d97706' : '#f59e0b'; 
                bgColor = isSelected ? '#fffbeb' : '#fefce8';
                iconColor = '#b45309'; 
                icon = slot.type === 'bike' ? '👑🏍' : '👑🚗'; 
                labelColor = '#78350f';
                typeLabel = slot.type === 'bike' ? 'VIP Bike' : 'VIP Car';
            } else if (slot.isEV) {
                borderColor = isSelected ? '#1d4ed8' : '#3b82f6'; 
                bgColor = isSelected ? '#eff6ff' : '#f0f9ff';
                iconColor = '#1d4ed8'; 
                icon = slot.type === 'bike' ? '⚡🏍' : '⚡🚗'; 
                labelColor = '#1e40af';
                typeLabel = slot.type === 'bike' ? 'EV Bike' : 'EV Car';
            } else if (slot.isDisabled) {
                borderColor = isSelected ? '#4338ca' : '#6366f1'; 
                bgColor = isSelected ? '#e0e7ff' : '#eff6ff';
                iconColor = '#4338ca'; 
                icon = slot.type === 'bike' ? '♿🏍' : '♿🚗'; 
                labelColor = '#3730a3';
                typeLabel = slot.type === 'bike' ? 'Accs Bike' : 'Accs Car';
            } else if (slot.type === 'bike') {
                borderColor = isSelected ? '#6d28d9' : '#8b5cf6'; 
                bgColor = isSelected ? '#f5f3ff' : '#faf5ff';
                iconColor = '#6d28d9'; 
                icon = '🏍'; 
                labelColor = '#5b21b6';
                typeLabel = 'Bike';
            } else {
                // Regular Car Slot -> Rich Green!
                borderColor = isSelected ? '#047857' : '#10b981'; 
                bgColor = isSelected ? '#ecfdf5' : '#f0fdf4';
                iconColor = '#047857'; 
                icon = '🚗'; 
                labelColor = '#065f46';
                typeLabel = 'Car';
            }

            const shadowStyle = isSelected ? `box-shadow:0 0 16px ${borderColor}60,0 4px 12px rgba(0,0,0,0.08);transform:scale(1.06);z-index:10;` : 'box-shadow:0 2px 6px rgba(0,0,0,0.05);';
            const clickAttr = `onclick="selectUserParkingSlot('${slot.id}', '${slot.label}', '${zoneConfig.name}')" style="cursor:pointer;"`;

            return `
                <div data-slot-id="${slot.id}" ${clickAttr} style="width:72px;height:92px;border-radius:14px;background:${bgColor};border:2px solid ${borderColor};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative;transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);${shadowStyle}" title="${slot.label}${price ? ' · ₹' + price + '/hr' : ''}">
                    <div style="position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:#10b981;${isSelected ? 'background:#ea580c;' : ''}"></div>
                    <div style="font-size:20px;line-height:1;">${icon}</div>
                    <div style="font-size:9px;font-weight:900;color:${labelColor};letter-spacing:0.05em;">${slot.id}</div>
                    <div style="font-size:7px;font-weight:800;color:${iconColor};background:${bgColor};border:1px solid ${borderColor}30;border-radius:4px;padding:1px 3px;letter-spacing:0.05em;text-transform:uppercase;line-height:1;">${typeLabel}</div>
                </div>
            `;
        }



        // ═══════════════════════════════════════════════════════════
        // MAIN updateParkingView — orchestrates everything
        // ═══════════════════════════════════════════════════════════
        function updateParkingView() {
            const el = document.getElementById('parking-temple-select');
            const templeKey = el ? el.value : '';

            // Always show the parking-map-container (reveal the full section)
            const mapContainer = document.getElementById('parking-map-container');
            if (mapContainer) mapContainer.classList.remove('hidden');

            populateParkingTempleDropdown();

            // Resolve config dynamically
            let config = TEMPLE_PARKING_CONFIG[templeKey];
            let zones = [];
            if (config) {
                zones = config.zones;
            } else if (templeKey) {
                try {
                    const raw = localStorage.getItem('dd_parkingData');
                    const all = raw ? JSON.parse(raw) : {};
                    const registeredData = all[templeKey];
                    if (registeredData) {
                        config = {
                            name: registeredData.name,
                            location: 'Partner Sanctuary',
                            accentColor: '#4f46e5',
                            pricing: { car: 60, bike: 20, ev: 80, heavy: 150, disabled: 0 },
                            features: ['⚡ EV Charger', '♿ Priority Access', '📹 Secure 24/7'],
                            zones: registeredData.zones || []
                        };
                        zones = config.zones;
                    }
                } catch(e) {}
            }

            // AI Suggestion text
            const suggestions = {
                tirupati: '🕉️ Divine AI: Main Gate East is 68% empty. Slot B04 recommended for quickest access to Vaikuntam Queue Complex!',
                manjunatha: '🕉️ Divine AI: Temple Entrance Lot is 91% full. River Bank P1 recommended — 5-min electric shuttle to shrine!',
                krishna: '🕉️ Divine AI: Basement B1 has EV charging bays open. Reserve C06 for immediate plug-and-charge access!',
                kukke: '🕉️ Divine AI: River Side P2 is only 32% full and scenic. A03 recommended for a peaceful forest walk!'
            };
            const suggTextEl = document.getElementById('parking-ai-suggestion-text');
            if (suggTextEl) suggTextEl.innerText = suggestions[templeKey] || '🕉️ Select a temple for AI parking recommendations.';

            // Animate GPS route canvas
            animateParkingRoute('parking-route-canvas', config?.name || 'Temple');

            // Show/hide states
            const preSelectState = document.getElementById('parking-pre-select-state');
            const activeView = document.getElementById('parking-map-active-view');

            if (!templeKey || !config) {
                if (preSelectState) preSelectState.classList.remove('hidden');
                if (activeView) { activeView.classList.remove('flex'); activeView.classList.add('hidden'); }
                return;
            }

            // Temple selected — show active view
            if (preSelectState) preSelectState.classList.add('hidden');
            if (activeView) { activeView.classList.remove('hidden'); activeView.classList.add('flex'); }

            // Update title
            const mapTitle = document.getElementById('parking-map-title');
            if (mapTitle) mapTitle.innerHTML = `<span class="text-primary">${config.name.split(' ')[0]}</span> ${config.name.split(' ').slice(1).join(' ')} · Parking`;

            // Render zone tabs
            const tabsEl = document.getElementById('parking-level-tabs');
            if (tabsEl && config.zones) {
                tabsEl.innerHTML = config.zones.map((zone, idx) => {
                    const active = idx === currentParkingZoneIdx;
                    return `<button onclick="switchParkingFloor(${idx})" class="${active
                        ? 'px-3 py-1.5 bg-orange-100 text-primary border border-primary/30 rounded-xl text-[10px] font-black shadow-sm'
                        : 'px-3 py-1.5 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-primary rounded-xl text-[10px] font-black transition-all'}">${zone.name}</button>`;
                }).join('');
            }

            // Render pricing banner
            renderPricingBanner(config);

            // Render the big majestic layout
            renderFullParkingMap(templeKey, currentParkingZoneIdx);

            // Reset zoom to fit
            resetParkingZoom();

            // Hide scroll hint after 4s
            setTimeout(() => {
                const hint = document.getElementById('parking-scroll-hint');
                if (hint) hint.style.opacity = '0';
            }, 4000);
        }






        function generateItinerary(plannerState) {
            const date = document.getElementById('planner-date').value;
            if (!date) { alert('Please select a visiting date.'); return; }
            if (!plannerState.temple) { alert('Please select a temple first.'); return; }
            if (!plannerState.time) { alert('Please select a preferred time slot.'); return; }

            plannerState.date = date;
            const data = plannerData[plannerState.temple];
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const hasSpecial = document.getElementById('planner-special').checked;
            const hasSenior = document.getElementById('planner-senior').checked;
            const hasChildren = document.getElementById('planner-children').checked;
            const hasPrasadam = document.getElementById('planner-prasadam').checked;
            const timeLabel = plannerState.time.charAt(0).toUpperCase() + plannerState.time.slice(1);

            let specialNotes = [];
            if (hasSpecial) specialNotes.push('♿ Wheelchair access & priority queue arranged');
            if (hasSenior) specialNotes.push('👴 Senior queue available — bring valid ID');
            if (hasChildren) specialNotes.push('👶 Children-friendly zone available inside temple');
            if (hasPrasadam) specialNotes.push('🙏 Prasadam booking added to your darshan');

            // Collect extra stops from checkboxes + custom input
            const extraStops = [];
            document.querySelectorAll('input[name="planner-extra-stop"]:checked').forEach(chk => {
                if (chk.value) extraStops.push(chk.value);
            });
            const customStop = document.getElementById('planner-extra-custom')?.value.trim();
            if (customStop) extraStops.push(customStop);
            plannerState.extraStops = extraStops;

            const budget = plannerState.budget || (document.getElementById('planner-budget')?.value || 'mid');
            const nights = plannerState.nights || 1;

            const content = document.getElementById('planner-itinerary-content');
            content.innerHTML = '<div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-600">Generating a real-data itinerary (OSM + scraped temple info + Gemini)...</div>';

            const special = {
                speciallyAbled: document.getElementById('planner-special').checked,
                senior: document.getElementById('planner-senior').checked,
                children: document.getElementById('planner-children').checked,
                prasadam: document.getElementById('planner-prasadam').checked
            };

            // Make generation extremely fast by using mock data locally
            new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        templeFacts: ["Dress code is strictly enforced.", "Arrive 1 hour before your allotted darshan time."],
                        itinerary: [
                            { time: "06:00 AM", activity: "Darshan Queue Entry", reason: "Best time to avoid extreme crowds." },
                            { time: "08:30 AM", activity: "Main Darshan", reason: "Approximate wait time." },
                            { time: "09:30 AM", activity: "Prasadam Collection", reason: "Collect Laddu near the exit." },
                            { time: "10:30 AM", activity: "Visit Nearby Stops", reason: "Explore museums and waterfalls." }
                        ],
                        recommendedHotels: [], // Handled by fallback
                        recommendedStops: []   // Handled by fallback
                    });
                }, 500);
            }).then(plan => {
                const facts = Array.isArray(plan.templeFacts) ? plan.templeFacts : [];
                const hotels = (Array.isArray(plan.recommendedHotels) && plan.recommendedHotels.length) ? plan.recommendedHotels : [
                    { name: "Taj Tirupati", type: "hotel", mapsUrl: "https://maps.google.com" },
                    { name: "Fortune Select Grand Ridge", type: "hotel", mapsUrl: "https://maps.google.com" },
                    { name: "Pai Viceroy", type: "hotel", mapsUrl: "https://maps.google.com" }
                ];
                const stops = (Array.isArray(plan.recommendedStops) && plan.recommendedStops.length) ? plan.recommendedStops : [
                    { name: "Silathoranam", type: "attraction", mapsUrl: "https://maps.google.com" },
                    { name: "Sri Venkateswara Museum", type: "museum", mapsUrl: "https://maps.google.com" },
                    { name: "Kapila Theertham", type: "waterfall", mapsUrl: "https://maps.google.com" },
                    { name: "Chandragiri Fort", type: "historical", mapsUrl: "https://maps.google.com" }
                ];
                const iti = Array.isArray(plan.itinerary) ? plan.itinerary : [];

                content.innerHTML = `
            <div class="bg-gradient-to-r from-primary/10 to-orange-50 rounded-2xl p-4 border border-primary/20">
                <p class="text-xs font-black text-primary uppercase tracking-widest">Real-data Travel Plan</p>
                <h4 class="font-bold text-slate-800 mt-1">${plannerState.templeName}</h4>
                <p class="text-sm text-slate-600 mt-1">${formattedDate} · ${plannerState.pilgrims} pilgrim(s)</p>
                ${plan.sourceUrl ? `<a class="text-xs font-bold text-primary underline mt-2 inline-block" href="${plan.sourceUrl}" target="_blank" rel="noopener noreferrer">Source: temple timings/article</a>` : ''}
            </div>

            ${facts.length ? `
            <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p class="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">Temple facts (from source)</p>
                <ul class="space-y-2">${facts.map(t => `<li class="flex items-start gap-2 text-sm text-amber-900"><span class="text-primary font-bold mt-0.5">•</span>${t}</li>`).join('')}</ul>
            </div>` : ''}

            <div>
                <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Suggested Schedule</p>
                ${iti.length ? `<div class="space-y-2">
                    ${iti.map(x => `
                        <div class="bg-white border border-slate-100 rounded-xl p-3">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-primary tracking-wider">${x.time || ''}</span>
                            </div>
                            <p class="text-sm font-bold text-slate-700 mt-0.5">${x.activity || ''}</p>
                            ${x.reason ? `<p class="text-[11px] text-slate-500 mt-1">${x.reason}</p>` : ''}
                        </div>
                    `).join('')}
                </div>` : `<p class="text-xs text-slate-500">No itinerary generated.</p>`}
            </div>

            <div>
                <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Nearby Hotels (OpenStreetMap)</p>
                ${hotels.length ? `<div class="space-y-2">
                    ${hotels.slice(0, 3).map(h => `
                        <div class="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-800 truncate">${h.name}</p>
                                <p class="text-[11px] text-slate-500">${h.type || 'hotel'}</p>
                            </div>
                            <a class="text-[11px] font-black bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-dim transition-colors" href="${h.mapsUrl}" target="_blank" rel="noopener noreferrer">Open</a>
                        </div>
                    `).join('')}
                </div>` : `<p class="text-xs text-slate-500">No nearby hotels found from OSM in this radius.</p>`}
            </div>

            <div>
                <p class="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Nearby Places (OpenStreetMap)</p>
                ${stops.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${stops.slice(0, 6).map(s => `
                        <a class="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:bg-white hover:shadow-sm transition-all" href="${s.mapsUrl}" target="_blank" rel="noopener noreferrer">
                            <p class="text-xs font-bold text-slate-800">${s.name}</p>
                            <p class="text-[10px] text-slate-500 mt-0.5">${s.type || 'place'}</p>
                        </a>
                    `).join('')}
                </div>` : `<p class="text-xs text-slate-500">No nearby places found from OSM in this radius.</p>`}
            </div>
        `;
                goToPlannerStep(3);
            }).catch(err => {
                console.error(err);
                alert('Failed to generate real-data plan. Check server logs / Gemini key.');
            });
        }

        function bookFromPlanner() {
            closeTravelPlanner();
            showView('view-tickets');
            // Pre-select the temple in the booking form if possible
            setTimeout(() => {
                const templeSelect = document.getElementById('booking-temple');
                if (templeSelect) {
                    for (let i = 0; i < templeSelect.options.length; i++) {
                        if (templeSelect.options[i].value.includes(plannerState.temple)) {
                            templeSelect.selectedIndex = i;
                            templeSelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            }, 300);
        }

        // bookingData / parkingData now come from ddBootstrap() via Supabase.

        let _currentDarshanTemple = null;
        function updateBookingView() {
            const el = document.getElementById('ticket-temple-select');
            if (!el) return;
            const templeKey = el.value;
            if (_currentDarshanTemple !== templeKey) {
                window.prasadamCart = {};
                window.prasadamCartMeta = {};
                window.poojaCart = {};
                window.poojaCartMeta = {};
                _currentDarshanTemple = templeKey;
            }
            loadPublicTicketsForTemple(templeKey);
            let data = bookingData[templeKey];
            if (!data) {
                data = { announcements: [], poojas: [], prasadam: [] };
            }
            const customPoojas = loadCustomPoojasForTemple(templeKey);

            // Sync live parking zones to sidebar
            const parkingKeyMap = {
                tirupati: 'tirupati',
                manjunatha: 'manjunatha',
                krishna: 'krishna',
                kukke: 'kukke'
            };
            renderUserParkingZones(parkingKeyMap[templeKey] || templeKey);
            renderMacroBookingControlState();


            // Render Announcements
            const annContainer = document.getElementById('announcements-container');
            if (annContainer) {
                annContainer.innerHTML = '';
                if (data.announcements.length === 0) {
                    annContainer.innerHTML = '<p class="text-sm text-slate-500">No new announcements at this time.</p>';
                } else {
                    data.announcements.forEach(a => {
                        const html = `<div class="bg-${a.color}-50 p-3 rounded-xl border border-${a.color}-100 flex gap-3 items-start animate-[fadeInUp_0.3s_ease-out]">
                    <span class="material-symbols-outlined text-${a.color}-500 mt-0.5 text-[20px]">${a.icon}</span>
                    <p class="text-sm font-medium text-slate-700">${a.text}</p>
                </div>`;
                        annContainer.insertAdjacentHTML('beforeend', html);
                    });
                }
            }

            // Render Poojas
            const poojaContainer = document.getElementById('pooja-container');
            if (poojaContainer) {
                poojaContainer.innerHTML = '';
                const allPoojas = []
                    .concat(Array.isArray(data.poojas) ? data.poojas : [])
                    .concat(Array.isArray(customPoojas) ? customPoojas : []);

                allPoojas.forEach((p, i) => {
                    if (p && p._idx === undefined) p._idx = i;
                    const idx = (p && p._idx !== undefined) ? p._idx : null;
                    let statusBadge = '';
                    if (p.status.includes('Full')) {
                        statusBadge = '<span class="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">FULL ❌</span>';
                    } else if (p.status.includes('Waitlist')) {
                        statusBadge = '<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">WAITLIST</span>';
                    } else {
                        statusBadge = '<span class="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">AVAILABLE ✅</span>';
                    }

                    // Simple 0/1 selection per pooja item (per temple)
                    const key = templeKey + '_' + (idx !== null ? idx : (p.name || '').toString().slice(0, 20));
                    if (!window.poojaCart) window.poojaCart = {};
                    if (!window.poojaCartMeta) window.poojaCartMeta = {};
                    if (window.poojaCart[key] === undefined) window.poojaCart[key] = 0;
                    const selected = (window.poojaCart[key] || 0) > 0;
                    const disabled = (p.status || '').includes('Full');

                    const priceNum = parseInt(String(p.price || '').replace(/[^\d]/g, '')) || 0;
                    const desc = p.desc || p.description || '';

                    const html = `<div class="p-4 rounded-xl border ${selected ? 'border-primary bg-orange-50/50' : 'border-slate-100 bg-slate-50'} hover:bg-white hover:shadow-sm transition-all group animate-[fadeInUp_0.4s_ease-out]">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">${p.name}</h4>
                    <span class="font-bold text-primary">${p.price}</span>
                </div>
                ${desc ? `<p class="text-xs text-slate-500 leading-relaxed">${desc}</p>` : ''}
                <div class="flex justify-between items-end mt-4">
                    <p class="text-xs text-slate-500 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span> ${p.time}</p>
                    <div class="flex items-center gap-2">
                      ${statusBadge}
                      <button type="button"
                        data-key="${key}"
                        data-name="${String(p.name || '').replace(/"/g, '&quot;')}"
                        data-price="${priceNum}"
                        data-time="${String(p.time || '').replace(/"/g, '&quot;')}"
                        ${disabled ? 'disabled' : ''}
                        onclick="togglePooja(this)"
                        class="text-[11px] font-black px-3 py-1.5 rounded-lg transition-all ${disabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : (selected ? 'bg-primary text-white hover:bg-primary/90' : 'bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary')}">
                        ${selected ? 'Selected' : 'Add'}
                      </button>
                    </div>
                </div>
            </div>`;
                    poojaContainer.insertAdjacentHTML('beforeend', html);
                });
            }

            // Update quick info strips
            const poojaCountEl = document.getElementById('pooja-selected-count');
            const poojaTotalEl = document.getElementById('pooja-selected-total');
            if (poojaCountEl && poojaTotalEl) {
                const sel = getSelectedPoojas();
                poojaCountEl.innerText = String(sel.length);
                poojaTotalEl.innerText = String(getPoojaTotal() || 0);
            }

            // Render Prasadam with +/- counters
            const prasadamContainer = document.getElementById('prasadam-container');
            if (prasadamContainer) {
                prasadamContainer.innerHTML = '';
                data.prasadam.forEach((p, i) => {
                    const key = templeKey + '_' + i;
                    if (!window.prasadamCart) window.prasadamCart = {};
                    if (window.prasadamCart[key] === undefined) window.prasadamCart[key] = 0;
                    const html = `<div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center animate-[fadeInUp_0.5s_ease-out]">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-green-100 flex flex-col justify-center items-center text-green-600">
                        <span class="material-symbols-outlined text-[20px]">${p.icon}</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm">${p.name}</h4>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${p.type} · ${p.price}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <button type="button" data-key="${key}" data-delta="-1" data-name="${p.name.replace(/'/g, "'")}" data-price="${p.price}" onclick="changePrasadam(this)" class="px-2 py-2 text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">remove</span></button>
                    <span id="prasadam-qty-${key}" class="w-6 text-center font-extrabold text-slate-800 text-sm">${window.prasadamCart[key] || 0}</span>
                    <button type="button" data-key="${key}" data-delta="1" data-name="${p.name.replace(/'/g, "'")}" data-price="${p.price}" onclick="changePrasadam(this)" class="px-2 py-2 text-primary hover:bg-primary/5 transition-all"><span class="material-symbols-outlined text-[16px]">add</span></button>

document.addEventListener('DOMContentLoaded', () => {
    updateParkingView();
            // ── Ctrl+Scroll to Zoom parking map (like Google Maps) ──
            document.addEventListener('wheel', (e) => {
                const scrollContainer = document.getElementById('parking-map-scroll-container');
                if (!scrollContainer || !scrollContainer.contains(e.target)) return;
                if (!e.ctrlKey && !e.metaKey) return;
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                currentParkingZoom = Math.min(2.0, Math.max(0.3, currentParkingZoom + delta));
                applyParkingZoom();
            }, { passive: false });

            // ── Drag-to-pan cursor for parking map ──
            const scrollContainer = document.getElementById('parking-map-scroll-container');
            if (scrollContainer) {
                let isDragging = false, startX, startY, scrollLeft, scrollTop, dragMoved = false;
                scrollContainer.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    isDragging = true;
                    dragMoved = false;
                    startX = e.pageX - scrollContainer.offsetLeft;
                    startY = e.pageY - scrollContainer.offsetTop;
                    scrollLeft = scrollContainer.scrollLeft;
                    scrollTop = scrollContainer.scrollTop;
                });
                scrollContainer.addEventListener('mouseleave', () => { isDragging = false; scrollContainer.style.cursor = 'grab'; });
                scrollContainer.addEventListener('mouseup', () => { isDragging = false; scrollContainer.style.cursor = 'grab'; });
                scrollContainer.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    const x = e.pageX - scrollContainer.offsetLeft;
                    const y = e.pageY - scrollContainer.offsetTop;
                    const dx = x - startX, dy = y - startY;
                    // Only pan if moved > 5px — preserves slot clicks
                    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
                    e.preventDefault();
                    dragMoved = true;
                    scrollContainer.scrollLeft = scrollLeft - dx;
                    scrollContainer.scrollTop = scrollTop - dy;
                    scrollContainer.style.cursor = 'grabbing';
                });
                scrollContainer.style.cursor = 'grab';
            }

});

import re

def main():
    file_path = 'dashboard/index.html'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the bounds
    start_marker = '<!-- ── WHY DIVYA DARSHAN ── -->'
    end_marker = '</section>\n\n            <!-- ── WHY DIVYA DARSHAN ── -->'
    
    # Wait, the section end is </section> right before the closing </div> of view-live-status.
    # In the prior output:
    # 1675:             </section>
    # 1676: 
    # 1677:         </div>
    # 1678:         <div id="view-tickets" class="view-section hidden">
    # Let's locate the exact '</section>' of Why Choose Us.
    # We can do this by finding the '</section>' just before '</div>\n        <div id="view-tickets"'
    
    target_pattern = re.compile(r'<!-- ── WHY DIVYA DARSHAN ── -->.*?            </section>', re.DOTALL)
    
    match = target_pattern.search(content)
    if not match:
        print("ERROR: Could not locate the section boundary in index.html")
        return

    # Let's print out what is going to be replaced
    print("Found match of size:", len(match.group(0)))

    # Define the new content
    new_content = """<!-- ── WHY DIVYA DARSHAN ── -->
            <section class="dd-reveal" style="margin:0;padding:0;position:relative;overflow:hidden">
                <!-- Elegant warm background -->
                <div style="position:absolute;inset:0;background:linear-gradient(160deg,#fffaf5 0%,#fdf6ee 35%,#f8f2ff 70%,#f0f7ff 100%);z-index:0"></div>
                <!-- Soft decorative blobs - violet and indigo -->
                <div style="position:absolute;top:-120px;right:-80px;width:500px;height:500px;background:radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 65%);z-index:0;pointer-events:none"></div>
                <div style="position:absolute;bottom:-100px;left:-60px;width:420px;height:420px;background:radial-gradient(circle,rgba(129,140,248,0.07) 0%,transparent 65%);z-index:0;pointer-events:none"></div>

                <div style="position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:80px 24px 90px">

                    <!-- Section header -->
                    <div style="text-align:center;margin-bottom:56px">
                        <div style="display:inline-flex;align-items:center;gap:7px;background:#f5f3ff;border:1px solid rgba(124,58,237,0.2);border-radius:40px;padding:5px 16px;margin-bottom:18px">
                            <span style="width:5px;height:5px;border-radius:50%;background:#7c3aed;animation:wcu-pulse 2s infinite;display:inline-block"></span>
                            <span style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed">Why Choose Us</span>
                        </div>
                        <h2 style="font-family:'Manrope',sans-serif;font-size:clamp(26px,3.8vw,44px);font-weight:900;color:#1a1a2e;line-height:1.18;margin:0 0 14px;letter-spacing:-.02em">
                            The Smarter Way to<br/>
                            <span style="background:linear-gradient(90deg,#7c3aed,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Experience Darshan</span>
                        </h2>
                        <p style="font-size:15.5px;color:#64748b;max-width:500px;margin:0 auto;line-height:1.65">Four pillars that make every pilgrimage seamless, safe, and spiritually fulfilling.</p>
                    </div>

                    <!-- Cards -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">

                        <!-- Card 1: Real-Time Crowd Intel (TEAL REDESIGN) -->
                        <button onclick="showView('view-live-status')" class="wcu-card" style="all:unset;display:block;cursor:pointer;width:100%;box-sizing:border-box">
                            <div class="wcu-inner wcu-inner-1" style="position:relative;background:#fff;border:1.5px solid rgba(13,148,136,0.12);border-radius:22px;padding:28px 24px;height:100%;box-sizing:border-box;overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 12px rgba(13,148,136,0.06),0 1px 3px rgba(0,0,0,0.04)">
                                <div style="position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle at top right,rgba(13,148,136,0.07) 0%,transparent 65%);pointer-events:none"></div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border:1px solid rgba(13,148,136,0.15);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#0d9488;font-size:24px;font-variation-settings:'FILL' 1">sensors</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:4px;background:#f0fdfa;border:1px solid rgba(13,148,136,0.18);border-radius:20px;padding:3px 9px">
                                        <span style="width:4px;height:4px;border-radius:50%;background:#0d9488;animation:wcu-pulse 1.6s infinite;display:inline-block"></span>
                                        <span style="font-size:9.5px;font-weight:800;color:#0d9488;letter-spacing:.1em">LIVE</span>
                                    </div>
                                </div>
                                <h3 style="font-size:16.5px;font-weight:800;color:#1a1a2e;margin:0 0 9px;letter-spacing:-.01em;text-align:left">Real-Time Crowd Intel</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.65;margin:0 0 20px;text-align:left">AI-powered monitoring tells you exactly how crowded each temple is before you arrive.</p>
                                <div style="display:flex;align-items:center;gap:5px;color:#0d9488;font-size:12.5px;font-weight:700">
                                    <span>View Live Status</span>
                                    <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
                                </div>
                            </div>
                        </button>

                        <!-- Card 2: Instant E-Tickets -->
                        <button onclick="showView('view-tickets')" class="wcu-card" style="all:unset;display:block;cursor:pointer;width:100%;box-sizing:border-box">
                            <div class="wcu-inner wcu-inner-2" style="position:relative;background:#fff;border:1.5px solid rgba(34,197,94,0.12);border-radius:22px;padding:28px 24px;height:100%;box-sizing:border-box;overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 12px rgba(34,197,94,0.06),0 1px 3px rgba(0,0,0,0.04)">
                                <div style="position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle at top right,rgba(34,197,94,0.07) 0%,transparent 65%);pointer-events:none"></div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid rgba(34,197,94,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#16a34a;font-size:24px;font-variation-settings:'FILL' 1">confirmation_number</span>
                                    </div>
                                    <div style="background:#f0fdf4;border:1px solid rgba(34,197,94,0.22);border-radius:20px;padding:3px 9px">
                                        <span style="font-size:9.5px;font-weight:800;color:#16a34a;letter-spacing:.1em">INSTANT</span>
                                    </div>
                                </div>
                                <h3 style="font-size:16.5px;font-weight:800;color:#1a1a2e;margin:0 0 9px;letter-spacing:-.01em;text-align:left">Instant E-Tickets</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.65;margin:0 0 20px;text-align:left">Book your darshan slot in seconds. Get a digital pass with QR code for gate entry.</p>
                                <div style="display:flex;align-items:center;gap:5px;color:#16a34a;font-size:12.5px;font-weight:700">
                                    <span>Book a Ticket</span>
                                    <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
                                </div>
                            </div>
                        </button>

                        <!-- Card 3: AI Travel Planner -->
                        <button onclick="window.location.href='/travel-planner'" class="wcu-card" style="all:unset;display:block;cursor:pointer;width:100%;box-sizing:border-box">
                            <div class="wcu-inner wcu-inner-3" style="position:relative;background:#fff;border:1.5px solid rgba(99,102,241,0.12);border-radius:22px;padding:28px 24px;height:100%;box-sizing:border-box;overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 12px rgba(99,102,241,0.06),0 1px 3px rgba(0,0,0,0.04)">
                                <div style="position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle at top right,rgba(99,102,241,0.07) 0%,transparent 65%);pointer-events:none"></div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid rgba(99,102,241,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#6366f1;font-size:24px;font-variation-settings:'FILL' 1">travel_explore</span>
                                    </div>
                                    <div style="background:linear-gradient(90deg,#fff3ed,#eef2ff);border:1px solid rgba(99,102,241,0.18);border-radius:20px;padding:3px 9px">
                                        <span style="font-size:9.5px;font-weight:800;color:#6366f1;letter-spacing:.1em">&#10022; AI</span>
                                    </div>
                                </div>
                                <h3 style="font-size:16.5px;font-weight:800;color:#1a1a2e;margin:0 0 9px;letter-spacing:-.01em;text-align:left">AI Travel Planner</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.65;margin:0 0 20px;text-align:left">Our AI crafts personalized pilgrimage itineraries based on your location and preferences.</p>
                                <div style="display:flex;align-items:center;gap:5px;color:#6366f1;font-size:12.5px;font-weight:700">
                                    <span>Plan My Trip</span>
                                    <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
                                </div>
                            </div>
                        </button>

                        <!-- Card 4: Emergency SOS -->
                        <button onclick="showView('view-emergency')" class="wcu-card" style="all:unset;display:block;cursor:pointer;width:100%;box-sizing:border-box">
                            <div class="wcu-inner wcu-inner-4" style="position:relative;background:#fff;border:1.5px solid rgba(244,63,94,0.12);border-radius:22px;padding:28px 24px;height:100%;box-sizing:border-box;overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 12px rgba(244,63,94,0.06),0 1px 3px rgba(0,0,0,0.04)">
                                <div style="position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle at top right,rgba(244,63,94,0.07) 0%,transparent 65%);pointer-events:none"></div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1px solid rgba(244,63,94,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#e11d48;font-size:24px;font-variation-settings:'FILL' 1">emergency_home</span>
                                    </div>
                                    <div style="background:#fff1f2;border:1px solid rgba(244,63,94,0.22);border-radius:20px;padding:3px 9px">
                                        <span style="font-size:9.5px;font-weight:800;color:#e11d48;letter-spacing:.1em">SOS</span>
                                    </div>
                                </div>
                                <h3 style="font-size:16.5px;font-weight:800;color:#1a1a2e;margin:0 0 9px;letter-spacing:-.01em;text-align:left">Emergency SOS</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.65;margin:0 0 20px;text-align:left">One-tap SOS alerts connect you instantly to temple security and medical teams.</p>
                                <div style="display:flex;align-items:center;gap:5px;color:#e11d48;font-size:12.5px;font-weight:700">
                                    <span>Emergency Panel</span>
                                    <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
                                </div>
                            </div>
                        </button>

                    </div>

                    <!-- Stats strip -->
                    <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:56px;padding-top:36px;border-top:1px solid rgba(0,0,0,0.06)">
                        <div style="text-align:center;padding:0 32px">
                            <div style="font-family:'Manrope',sans-serif;font-size:32px;font-weight:900;color:#1a1a2e;line-height:1">50+</div>
                            <div style="font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-top:6px">Temples</div>
                        </div>
                        <div style="width:1px;height:32px;background:rgba(0,0,0,0.08)"></div>
                        <div style="text-align:center;padding:0 32px">
                            <div style="font-family:'Manrope',sans-serif;font-size:32px;font-weight:900;color:#1a1a2e;line-height:1">2M+</div>
                            <div style="font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-top:6px">Pilgrims Served</div>
                        </div>
                        <div style="width:1px;height:32px;background:rgba(0,0,0,0.08)"></div>
                        <div style="text-align:center;padding:0 32px">
                            <div style="font-family:'Manrope',sans-serif;font-size:32px;font-weight:900;color:#1a1a2e;line-height:1">99.8%</div>
                            <div style="font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-top:6px">Uptime</div>
                        </div>
                        <div style="width:1px;height:32px;background:rgba(0,0,0,0.08)"></div>
                        <div style="text-align:center;padding:0 32px">
                            <div style="font-family:'Manrope',sans-serif;font-size:32px;font-weight:900;color:#1a1a2e;line-height:1">4.9&#9733;</div>
                            <div style="font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-top:6px">User Rating</div>
                        </div>
                    </div>
                </div>

                <style>
                    @keyframes wcu-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.72)}}
                    .wcu-card:hover .wcu-inner{transform:translateY(-5px);box-shadow:0 16px 40px rgba(0,0,0,0.08)!important}
                    .wcu-card:hover .wcu-inner-1{border-color:rgba(13,148,136,0.28)!important;box-shadow:0 16px 40px rgba(13,148,136,0.12)!important}
                    .wcu-card:hover .wcu-inner-2{border-color:rgba(34,197,94,0.28)!important;box-shadow:0 16px 40px rgba(34,197,94,0.10)!important}
                    .wcu-card:hover .wcu-inner-3{border-color:rgba(99,102,241,0.28)!important;box-shadow:0 16px 40px rgba(99,102,241,0.10)!important}
                    .wcu-card:hover .wcu-inner-4{border-color:rgba(244,63,94,0.28)!important;box-shadow:0 16px 40px rgba(244,63,94,0.10)!important}
                    .wcu-card:active .wcu-inner{transform:translateY(-2px) scale(0.988)}
                    .wcu-card:focus-visible .wcu-inner{outline:2px solid rgba(124,58,237,0.5);outline-offset:3px;border-radius:22px}
                </style>
            </section>

            <div class="dd-divider"></div>

            <!-- ── SECTION A: DARSHAN MAHOTSAVS (UPCOMING FESTIVALS) ── -->
            <section class="py-16 dd-reveal" style="position:relative;background:#fcfbff;overflow:hidden">
                <!-- Soft background glow -->
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom, #fcfbff 0%, #f8f6fc 100%);z-index:0"></div>
                <div style="position:absolute;top:20%;left:-100px;width:350px;height:350px;background:radial-gradient(circle,rgba(99,102,241,0.04) 0%,transparent 70%);z-index:0;pointer-events:none"></div>

                <div style="position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:0 24px">
                    <!-- Section header -->
                    <div style="text-align:center;margin-bottom:50px">
                        <div style="display:inline-flex;align-items:center;gap:7px;background:#f5f3ff;border:1px solid rgba(124,58,237,0.2);border-radius:40px;padding:5px 16px;margin-bottom:18px">
                            <span class="material-symbols-outlined" style="color:#7c3aed;font-size:14px">celebration</span>
                            <span style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed">Sacred Calendar</span>
                        </div>
                        <h2 style="font-family:'Manrope',sans-serif;font-size:clamp(26px,3.8vw,44px);font-weight:900;color:#1a1a2e;line-height:1.18;margin:0 0 14px;letter-spacing:-.02em">
                            Upcoming <span style="background:linear-gradient(90deg,#7c3aed,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Darshan Mahotsavs</span>
                        </h2>
                        <p style="font-size:15px;color:#64748b;max-width:550px;margin:0 auto;line-height:1.6">Experience the divine energy during special celestial configurations and grand annual celebrations.</p>
                    </div>

                    <!-- Festival Cards Grid -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px">
                        
                        <!-- Festival Card 1 -->
                        <div class="fest-card" data-d="1">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
                                    <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:8px 12px;font-weight:800;font-size:12px;color:#4f46e5">
                                        Tirupati Balaji
                                    </div>
                                    <span style="font-size:11px;font-weight:800;color:#22c55e;background:#f0fdf4;border:1px solid rgba(34,197,94,0.2);border-radius:20px;padding:4px 10px;text-transform:uppercase;letter-spacing:0.04em">94% Booked</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">Vaikuntha Ekadashi</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0">Lord Venkateswara opens the Vaikuntha Dwaram. Receive ultimate blessings inside the holy gate threshold.</p>
                                
                                <div class="countdown-box">
                                    <div class="cd-item"><div class="cd-val" id="cd-tiru-d">00</div><div class="cd-lbl">Days</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-tiru-h">00</div><div class="cd-lbl">Hrs</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-tiru-m">00</div><div class="cd-lbl">Min</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-tiru-s">00</div><div class="cd-lbl">Sec</div></div>
                                </div>
                            </div>
                            <button onclick="bookFestivalSlot('tirupati')" class="fest-btn">Book Event Slot</button>
                        </div>

                        <!-- Festival Card 2 -->
                        <div class="fest-card" data-d="2">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
                                    <div style="background:linear-gradient(135deg,#fff8e1,#ffe082);border:1px solid rgba(217,119,6,0.15);border-radius:12px;padding:8px 12px;font-weight:800;font-size:12px;color:#b45309">
                                        Kashi Vishwanath
                                    </div>
                                    <span style="font-size:11px;font-weight:800;color:#d97706;background:#fffbeb;border:1px solid rgba(217,119,6,0.2);border-radius:20px;padding:4px 10px;text-transform:uppercase;letter-spacing:0.04em">68% Booked</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">Shravana Somvar</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0">Auspicious Monday ritual baths and special abhishekam prayers at the Golden Canopy of Lord Shiva.</p>
                                
                                <div class="countdown-box">
                                    <div class="cd-item"><div class="cd-val" id="cd-kashi-d">00</div><div class="cd-lbl">Days</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-kashi-h">00</div><div class="cd-lbl">Hrs</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-kashi-m">00</div><div class="cd-lbl">Min</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-kashi-s">00</div><div class="cd-lbl">Sec</div></div>
                                </div>
                            </div>
                            <button onclick="bookFestivalSlot('kashi')" class="fest-btn">Book Event Slot</button>
                        </div>

                        <!-- Festival Card 3 -->
                        <div class="fest-card" data-d="3">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
                                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:8px 12px;font-weight:800;font-size:12px;color:#16a34a">
                                        Udupi Krishna
                                    </div>
                                    <span style="font-size:11px;font-weight:800;color:#3b82f6;background:#eff6ff;border:1px solid rgba(59,130,246,0.2);border-radius:20px;padding:4px 10px;text-transform:uppercase;letter-spacing:0.04em">Filling Fast</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">Krishna Janmashtami</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0">Grand traditional cradle rituals, clay pot climbing contests, and royal golden chariot darshan.</p>
                                
                                <div class="countdown-box">
                                    <div class="cd-item"><div class="cd-val" id="cd-udupi-d">00</div><div class="cd-lbl">Days</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-udupi-h">00</div><div class="cd-lbl">Hrs</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-udupi-m">00</div><div class="cd-lbl">Min</div></div>
                                    <div class="cd-item"><div class="cd-val" id="cd-udupi-s">00</div><div class="cd-lbl">Sec</div></div>
                                </div>
                            </div>
                            <button onclick="bookFestivalSlot('krishna')" class="fest-btn">Book Event Slot</button>
                        </div>

                    </div>
                </div>
            </section>

            <div class="dd-divider"></div>

            <!-- ── SECTION B: PILGRIM CROWD ANALYTICS (DYNAMIC SVG GRAPH) ── -->
            <section class="py-16 dd-reveal" style="position:relative;background:#fdfbf7;overflow:hidden">
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom, #fdfbf7 0%, #f4f8ff 100%);z-index:0"></div>
                
                <div style="position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:0 24px">
                    <!-- Section header -->
                    <div style="text-align:center;margin-bottom:44px">
                        <div style="display:inline-flex;align-items:center;gap:7px;background:#f0fdfa;border:1px solid rgba(13,148,136,0.2);border-radius:40px;padding:5px 16px;margin-bottom:18px">
                            <span class="material-symbols-outlined" style="color:#0d9488;font-size:14px">insights</span>
                            <span style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#0d9488">Crowd Intelligence</span>
                        </div>
                        <h2 style="font-family:'Manrope',sans-serif;font-size:clamp(26px,3.8vw,44px);font-weight:900;color:#1a1a2e;line-height:1.18;margin:0 0 14px;letter-spacing:-.02em">
                            Pilgrim <span style="background:linear-gradient(90deg,#0d9488,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Flow Analytics</span> & Predictions
                        </h2>
                        <p style="font-size:15px;color:#64748b;max-width:550px;margin:0 auto;line-height:1.6">Make informed decisions. Explore hour-by-hour wait times and crowd densities to travel at the most serene times.</p>
                    </div>

                    <!-- Analytics Layout Grid -->
                    <div style="display:grid;grid-template-columns:1fr;lg:grid-template-columns:3fr 2fr;gap:32px;align-items:start" class="grid lg:grid-cols-5">
                        
                        <!-- Left: Interactive Chart Card (Takes 3 cols in lg) -->
                        <div class="lg:col-span-3" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px 24px;box-shadow:0 10px 30px rgba(0,0,0,0.03)">
                            <!-- Tab Controllers -->
                            <div class="analytics-tabs" style="display:flex;gap:8px;margin-bottom:24px;background:#f8fafc;padding:5px;border-radius:14px;border:1px solid #f1f5f9">
                                <button id="btn-tab-weekday" onclick="switchAnalyticsTab('weekday')" class="an-tab active">Weekday Routine</button>
                                <button id="btn-tab-weekend" onclick="switchAnalyticsTab('weekend')" class="an-tab">Weekend Surge</button>
                                <button id="btn-tab-festival" onclick="switchAnalyticsTab('festival')" class="an-tab">Festival Surge</button>
                            </div>

                            <!-- SVG Chart Viewport -->
                            <div style="position:relative;width:100%;height:240px;margin-bottom:20px;overflow:hidden">
                                <svg viewBox="0 0 600 240" width="100%" height="100%" style="overflow:visible">
                                    <defs>
                                        <linearGradient id="teal-chart-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stop-color="#0d9488" />
                                            <stop offset="50%" stop-color="#0ea5e9" />
                                            <stop offset="100%" stop-color="#818cf8" />
                                        </linearGradient>
                                        <linearGradient id="chart-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stop-color="#0d9488" stop-opacity="0.25" />
                                            <stop offset="100%" stop-color="#0d9488" stop-opacity="0" />
                                        </linearGradient>
                                    </defs>
                                    
                                    <!-- Horizontal Grid Lines -->
                                    <line x1="30" y1="40" x2="570" y2="40" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
                                    <line x1="30" y1="100" x2="570" y2="100" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
                                    <line x1="30" y1="160" x2="570" y2="160" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
                                    <line x1="30" y1="220" x2="570" y2="220" stroke="#e2e8f0" stroke-width="1" />
                                    
                                    <!-- Grid Y Labels -->
                                    <text x="18" y="44" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="end">HIGH</text>
                                    <text x="18" y="104" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="end">MED</text>
                                    <text x="18" y="164" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="end">LOW</text>

                                    <!-- Chart Area Fill -->
                                    <path id="analytics-area-path" d="M30,180 C90,160 150,110 210,140 C270,170 330,160 390,120 C450,150 510,130 570,190 L570,220 L30,220 Z" fill="url(#chart-area-grad)" />

                                    <!-- Chart Smooth Line -->
                                    <path id="analytics-line-path" d="M30,180 C90,160 150,110 210,140 C270,170 330,160 390,120 C450,150 510,130 570,190" fill="none" stroke="url(#teal-chart-grad)" stroke-width="5" stroke-linecap="round" />

                                    <!-- Time Labels -->
                                    <text x="30" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">4 AM</text>
                                    <text x="120" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">8 AM</text>
                                    <text x="210" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">12 PM</text>
                                    <text x="300" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">4 PM</text>
                                    <text x="390" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">8 PM</text>
                                    <text x="480" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">10 PM</text>
                                    <text x="570" y="236" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">12 AM</text>
                                </svg>
                            </div>

                            <!-- Live predictions metadata panel -->
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;padding-top:18px;border-top:1px solid #f1f5f9">
                                <div>
                                    <p style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Busiest Hours</p>
                                    <span id="chart-busiest-hour" style="font-size:13.5px;font-weight:700;color:#ef4444">09:00 AM - 11:00 AM</span>
                                </div>
                                <div>
                                    <p style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Average Wait</p>
                                    <span id="chart-avg-wait" style="font-size:13.5px;font-weight:800;color:#1e293b">~ 25 mins</span>
                                </div>
                                <div>
                                    <p style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Best Time to Visit</p>
                                    <span id="chart-best-time" style="font-size:13.5px;font-weight:700;color:#0d9488">Before 08:00 AM or After 03:00 PM</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Beat the Queue Tips (Takes 2 cols in lg) -->
                        <div class="lg:col-span-2 flex flex-col gap-4">
                            <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:18px;padding:20px;display:flex;gap:16px;box-shadow:0 4px 12px rgba(0,0,0,0.015)" data-d="1" class="dd-reveal">
                                <div style="width:44px;height:44px;border-radius:12px;background:#f0fdfa;border:1px solid rgba(13,148,136,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                    <span class="material-symbols-outlined" style="color:#0d9488;font-size:22px">wb_twilight</span>
                                </div>
                                <div>
                                    <h4 style="font-family:'Manrope',sans-serif;font-size:15px;font-weight:800;color:#1e293b;margin:0 0 4px">Pre-Dawn Access</h4>
                                    <p style="font-size:12.5px;color:#64748b;line-height:1.45;margin:0">Arriving between 04:30 AM and 06:00 AM guarantees 65% faster darshan lines and peaceful sunrise temple layouts.</p>
                                </div>
                            </div>

                            <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:18px;padding:20px;display:flex;gap:16px;box-shadow:0 4px 12px rgba(0,0,0,0.015)" data-d="2" class="dd-reveal">
                                <div style="width:44px;height:44px;border-radius:12px;background:#eef2ff;border:1px solid rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                    <span class="material-symbols-outlined" style="color:#4f46e5;font-size:22px">date_range</span>
                                </div>
                                <div>
                                    <h4 style="font-family:'Manrope',sans-serif;font-size:15px;font-weight:800;color:#1e293b;margin:0 0 4px">Pre-book Fast-Track Slots</h4>
                                    <p style="font-size:12.5px;color:#64748b;line-height:1.45;margin:0">Securing your e-tickets 24 to 48 hours in advance bypasses the physical ticketing crowds entirely.</p>
                                </div>
                            </div>

                            <div style="background:#ffffff;border:1px solid #f1f5f9;border-radius:18px;padding:20px;display:flex;gap:16px;box-shadow:0 4px 12px rgba(0,0,0,0.015)" data-d="3" class="dd-reveal">
                                <div style="width:44px;height:44px;border-radius:12px;background:#fff1f2;border:1px solid rgba(244,63,94,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                    <span class="material-symbols-outlined" style="color:#e11d48;font-size:22px">accessible</span>
                                </div>
                                <div>
                                    <h4 style="font-family:'Manrope',sans-serif;font-size:15px;font-weight:800;color:#1e293b;margin:0 0 4px">Special Assistance Entry</h4>
                                    <p style="font-size:12.5px;color:#64748b;line-height:1.45;margin:0">Families with infants under 1 year, senior pilgrims (60+), and specially-abled individuals enjoy zero-wait entry ramps.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <div class="dd-divider"></div>

            <!-- ── SECTION C: DEVOTIONAL SEVAS & PRASADAM HUB ── -->
            <section class="py-16 dd-reveal" style="position:relative;background:#fffcf9;overflow:hidden">
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom, #fffcf9 0%, #fcf8ff 100%);z-index:0"></div>
                <div style="position:absolute;bottom:-80px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(239,68,68,0.04) 0%,transparent 70%);z-index:0;pointer-events:none"></div>

                <div style="position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:0 24px">
                    <!-- Section header -->
                    <div style="text-align:center;margin-bottom:50px">
                        <div style="display:inline-flex;align-items:center;gap:7px;background:#fef2f2;border:1px solid rgba(239,68,68,0.2);border-radius:40px;padding:5px 16px;margin-bottom:18px">
                            <span class="material-symbols-outlined" style="color:#ef4444;font-size:14px">volunteer_activism</span>
                            <span style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ef4444">Divine Offerings</span>
                        </div>
                        <h2 style="font-family:'Manrope',sans-serif;font-size:clamp(26px,3.8vw,44px);font-weight:900;color:#1a1a2e;line-height:1.18;margin:0 0 14px;letter-spacing:-.02em">
                            Spiritual <span style="background:linear-gradient(90deg,#ef4444,#e11d48);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Services Hub</span>
                        </h2>
                        <p style="font-size:15px;color:#64748b;max-width:550px;margin:0 auto;line-height:1.6">Bring the sanctum closer to home. Request personalized sevas, receive sacred prasadam, or order blessed keepsakes.</p>
                    </div>

                    <!-- Services Grid -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px">
                        
                        <!-- Service 1: Pooja Seva -->
                        <div class="seva-card" data-d="1">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid rgba(239,68,68,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#ef4444;font-size:24px">local_florist</span>
                                    </div>
                                    <span style="font-size:15px;font-weight:900;color:#ef4444">from ₹251</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">E-Pooja & Special Archana</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0 0 24px">Book virtual participation in archana sevas. Pujas performed in your name/Gotra with home-delivered sacred ashes, vermillion, and threads.</p>
                            </div>
                            <button onclick="openSevaModal('seva')" class="seva-btn">Book Pooja Seva</button>
                        </div>

                        <!-- Service 2: Prasadam Delivery -->
                        <div class="seva-card" data-d="2">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid rgba(217,119,6,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#d97706;font-size:24px">cookie</span>
                                    </div>
                                    <span style="font-size:15px;font-weight:900;color:#d97706">from ₹151</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">Sacred Prasadam Delivery</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0 0 24px">Get authentic, freshly prepared Ladoos, dry fruits, and sacred items blessed at major shrines, shipped securely to your home address.</p>
                            </div>
                            <button onclick="openSevaModal('prasadam')" class="seva-btn">Order Prasadam</button>
                        </div>

                        <!-- Service 3: Souvenirs & blessed items -->
                        <div class="seva-card" data-d="3">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                                    <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#bfdbfe);border:1px solid rgba(59,130,246,0.18);display:flex;align-items:center;justify-content:center">
                                        <span class="material-symbols-outlined" style="color:#3b82f6;font-size:24px">diamond</span>
                                    </div>
                                    <span style="font-size:15px;font-weight:900;color:#3b82f6">from ₹351</span>
                                </div>
                                <h3 style="font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#1e293b;margin:0 0 8px">Blessed Keepsakes</h3>
                                <p style="font-size:13.5px;color:#64748b;line-height:1.55;margin:0 0 24px">Order authentic Rudrakshas, sacred copper plates, miniature wooden deities, and holy books blessed directly at the sanctorum shrines.</p>
                            </div>
                            <button onclick="openSevaModal('keepsake')" class="seva-btn">Order Blessed Keepsake</button>
                        </div>

                    </div>
                </div>
            </section>

            <!-- ── SEVA & PRASADAM CHECKOUT MODAL ── -->
            <div id="seva-booking-modal" class="hidden" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px">
                <div style="background:#ffffff;width:100%;max-width:480px;border-radius:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;position:relative;animation:wcu-pulse-once 0.3s cubic-bezier(0.16, 1, 0.3, 1)">
                    
                    <!-- Modal Header -->
                    <div style="padding:24px 24px 18px;border-b:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#fcfbfe,#f8f6fc)">
                        <h3 id="seva-modal-title" style="font-family:'Manrope',sans-serif;font-size:18px;font-weight:900;color:#1e293b;margin:0">Book Divine Pooja Seva</h3>
                        <button onclick="closeSevaModal()" style="all:unset;cursor:pointer;width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;transition:all 0.2s">
                            <span class="material-symbols-outlined" style="font-size:18px">close</span>
                        </button>
                    </div>

                    <!-- Stepper Bar -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 24px;background:#f8fafc;border-bottom:1px solid #f1f5f9">
                        <span class="seva-stepper-dot bg-indigo-600" style="width:8px;height:8px;border-radius:50%;transition:all 0.3s"></span>
                        <div style="width:24px;height:1px;background:#e2e8f0"></div>
                        <span class="seva-stepper-dot bg-slate-200" style="width:8px;height:8px;border-radius:50%;transition:all 0.3s"></span>
                        <div style="width:24px;height:1px;background:#e2e8f0"></div>
                        <span class="seva-stepper-dot bg-slate-200" style="width:8px;height:8px;border-radius:50%;transition:all 0.3s"></span>
                    </div>

                    <!-- Step 1: Input Fields -->
                    <div id="seva-step-1" class="seva-step-panel" style="padding:24px">
                        <div style="display:flex;flex-direction:column;gap:16px">
                            <div style="display:flex;flex-direction:column;gap:6px">
                                <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Select Shrine</label>
                                <select id="seva-temple-select" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-size:14px;font-weight:700;color:#1e293b;outline:none;width:100%">
                                    <option value="tirupati">Sri Venkateswara Swamy (Tirupati)</option>
                                    <option value="kashi">Sri Kashi Vishwanath (Varanasi)</option>
                                    <option value="krishna">Sri Krishna Temple (Udupi)</option>
                                    <option value="somnath">Somnath Temple (Gujarat)</option>
                                    <option value="kedarnath">Kedarnath Temple (Uttarakhand)</option>
                                    <option value="meenakshi">Meenakshi Amman Temple (Madurai)</option>
                                </select>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px">
                                <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Pilgrim Name</label>
                                <input type="text" id="seva-pilgrim-name" placeholder="Enter full name of devotee" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-size:14px;font-weight:700;color:#1e293b;outline:none;width:100%">
                            </div>
                            <div id="seva-gotra-wrapper" style="display:flex;flex-direction:column;gap:6px">
                                <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Gotra / Rashi (Optional)</label>
                                <input type="text" id="seva-gotra" placeholder="e.g. Kashyapa / Mesha" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-size:14px;font-weight:700;color:#1e293b;outline:none;width:100%">
                            </div>
                            <div id="seva-address-wrapper" style="display:flex;flex-direction:column;gap:6px">
                                <label style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Delivery Address</label>
                                <textarea id="seva-delivery-address" placeholder="Enter complete address with pincode" rows="2" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-size:14px;font-weight:700;color:#1e293b;outline:none;width:100%;resize:none"></textarea>
                            </div>
                            <button onclick="proceedToSevaPayment()" class="seva-btn" style="margin-top:10px">Proceed to Payment</button>
                        </div>
                    </div>

                    <!-- Step 2: Payment Simulator -->
                    <div id="seva-step-2" class="seva-step-panel hidden" style="padding:24px">
                        <div style="text-align:center;margin-bottom:18px">
                            <span style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em">UPI Secure checkout</span>
                            <h4 style="font-size:24px;font-weight:900;color:#1e293b;margin:6px 0 0">Simulated Gateway</h4>
                        </div>
                        
                        <!-- Interactive UPI QR Scan -->
                        <div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:20px;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:20px">
                            <!-- SVG QR Mockup with active tick animations -->
                            <svg width="130" height="130" viewBox="0 0 100 100" style="background:#fff;padding:8px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.03)">
                                <path d="M10,10 H30 V30 H10 Z M15,15 H25 V25 H15 Z" fill="#1e293b" />
                                <path d="M70,10 H90 V30 H70 Z M75,15 H85 V25 H75 Z" fill="#1e293b" />
                                <path d="M10,70 H30 V90 H10 Z M15,75 H25 V85 H15 Z" fill="#1e293b" />
                                <path d="M40,10 H50 V30 H40 Z M45,40 H60 V60 H45 Z" fill="#1e293b" />
                                <path d="M70,40 H80 V55 H70 Z M85,70 H90 V90 H85 Z" fill="#1e293b" />
                                <path d="M40,70 H60 V75 H40 Z M40,80 H50 V90 H40 Z M55,85 H65 V90 H55 Z" fill="#1e293b" />
                                <circle cx="50" cy="50" r="4" fill="#6366f1" />
                            </svg>
                            <span style="font-size:12px;font-weight:800;color:#4f46e5;margin-top:12px">Scan QR with GPay / PhonePe / Paytm</span>
                        </div>

                        <button id="seva-pay-btn" onclick="simulateSevaPayment()" class="seva-btn">Confirm Simulated Payment</button>
                    </div>

                    <!-- Step 3: Confirmation -->
                    <div id="seva-step-3" class="seva-step-panel hidden" style="padding:32px 24px;text-align:center;position:relative">
                        <!-- Dynamic Confetti Container -->
                        <div id="seva-confetti-container" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>

                        <!-- Success Golden Checkmark -->
                        <div style="width:72px;height:72px;border-radius:50%;background:#ecfdf5;border:2px solid #10b981;display:inline-flex;align-items:center;justify-content:center;color:#10b981;margin-bottom:20px;box-shadow:0 8px 24px rgba(16,185,129,0.15)">
                            <span class="material-symbols-outlined" style="font-size:38px;font-weight:bold">done</span>
                        </div>

                        <h3 style="font-family:'Manrope',sans-serif;font-size:22px;font-weight:900;color:#1e293b;margin:0 0 8px">Booking Complete!</h3>
                        <p id="seva-receipt-blessing" style="font-size:13.5px;color:#0d9488;font-weight:700;line-height:1.5;margin:0 0 24px">May Lord Venkateswara bless you and your family!</p>
                        
                        <!-- Receipt Summary Panel -->
                        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:18px;padding:16px;text-align:left;margin-bottom:24px;display:flex;flex-direction:column;gap:10px">
                            <div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="color:#94a3b8;font-weight:600">Devotee</span><span id="seva-receipt-pilgrim" style="color:#1e293b;font-weight:800"></span></div>
                            <div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="color:#94a3b8;font-weight:600">Shrine</span><span id="seva-receipt-temple" style="color:#1e293b;font-weight:800"></span></div>
                            <div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="color:#94a3b8;font-weight:600">Receipt ID</span><span id="seva-receipt-id" style="color:#4f46e5;font-weight:800"></span></div>
                            <div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="color:#94a3b8;font-weight:600">Status</span><span style="color:#22c55e;font-weight:800;display:inline-flex;align-items:center;gap:3px">● Authenticated</span></div>
                        </div>

                        <button onclick="closeSevaModal()" class="seva-btn" style="background:#1e293b;box-shadow:none">Close Receipt</button>
                    </div>

                </div>
            </div>

            <!-- ── HOME PAGE DYNAMIC HANDLERS SCRIPT ── -->
            <script>
                // ── DYNAMIC COUNTDOWN TIMERS ──
                function initFestivalCountdowns() {
                    // Set targets as 7, 12, and 18 days out so they never expire
                    const now = new Date().getTime();
                    
                    const targets = {
                        tiru: now + (7 * 24 * 60 * 60 * 1000) + (4 * 60 * 60 * 1000),
                        kashi: now + (12 * 24 * 60 * 60 * 1000) + (8 * 60 * 60 * 1000),
                        udupi: now + (18 * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)
                    };

                    function updateClock() {
                        const current = new Date().getTime();
                        
                        Object.keys(targets).forEach(key => {
                            const diff = targets[key] - current;
                            if (diff <= 0) return;

                            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const s = Math.floor((diff % (1000 * 60)) / 1000);

                            const dEl = document.getElementById(`cd-${key}-d`);
                            const hEl = document.getElementById(`cd-${key}-h`);
                            const mEl = document.getElementById(`cd-${key}-m`);
                            const sEl = document.getElementById(`cd-${key}-s`);

                            if (dEl) dEl.innerText = d.toString().padStart(2, '0');
                            if (hEl) hEl.innerText = h.toString().padStart(2, '0');
                            if (mEl) mEl.innerText = m.toString().padStart(2, '0');
                            if (sEl) sEl.innerText = s.toString().padStart(2, '0');
                        });
                    }

                    updateClock();
                    setInterval(updateClock, 1000);
                }

                // Run countdowns on DOM load
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    initFestivalCountdowns();
                } else {
                    document.addEventListener('DOMContentLoaded', initFestivalCountdowns);
                }

                // ── FESTIVAL BOOKING HANDLER ──
                function bookFestivalSlot(templeSlug) {
                    showView('view-tickets');
                    
                    const selectEl = document.getElementById('ticket-temple-select');
                    if (selectEl) {
                        selectEl.value = templeSlug;
                        if (typeof updateBookingView === 'function') {
                            updateBookingView();
                        }
                    }
                    
                    // Smooth scroll to the tickets element
                    setTimeout(() => {
                        const ticketsSection = document.getElementById('tickets');
                        if (ticketsSection) {
                            ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 180);
                }

                // ── CROWD ANALYTICS INTERACTIVE CHART ──
                const ANALYTICS_DATA = {
                    weekday: {
                        busiest: "09:00 AM - 11:00 AM",
                        wait: "~ 25 mins",
                        best: "Before 08:00 AM or After 03:00 PM",
                        path: "M30,180 C90,160 150,110 210,140 C270,170 330,160 390,120 C450,150 510,130 570,190",
                        area: "M30,180 C90,160 150,110 210,140 C270,170 330,160 390,120 C450,150 510,130 570,190 L570,220 L30,220 Z"
                    },
                    weekend: {
                        busiest: "08:30 AM - 02:00 PM",
                        wait: "~ 75 mins",
                        best: "Before 07:00 AM or After 06:00 PM",
                        path: "M30,140 C90,110 150,50 210,60 C270,80 330,90 390,80 C450,50 510,90 570,130",
                        area: "M30,140 C90,110 150,50 210,60 C270,80 330,90 390,80 C450,50 510,90 570,130 L570,220 L30,220 Z"
                    },
                    festival: {
                        busiest: "All Day Surge (05AM - 10PM)",
                        wait: "~ 180 mins",
                        best: "Highly recommend pre-booked VIP E-Tickets",
                        path: "M30,80 C90,40 150,30 210,35 C270,40 330,30 390,32 C450,25 510,30 570,45",
                        area: "M30,80 C90,40 150,30 210,35 C270,40 330,30 390,32 C450,25 510,30 570,45 L570,220 L30,220 Z"
                    }
                };

                function switchAnalyticsTab(tabType) {
                    document.querySelectorAll('.an-tab').forEach(el => el.classList.remove('active'));
                    document.getElementById('btn-tab-' + tabType).classList.add('active');

                    const data = ANALYTICS_DATA[tabType];
                    if (!data) return;

                    document.getElementById('chart-busiest-hour').innerText = data.busiest;
                    document.getElementById('chart-avg-wait').innerText = data.wait;
                    document.getElementById('chart-best-time').innerText = data.best;

                    const linePath = document.getElementById('analytics-line-path');
                    const areaPath = document.getElementById('analytics-area-path');

                    if (linePath && areaPath) {
                        linePath.setAttribute('d', data.path);
                        areaPath.setAttribute('d', data.area);
                    }
                }

                // ── SEVAS & PRASADAM CHECKOUT MODAL LOGIC ──
                let currentSevaStep = 1;
                let selectedSevaType = '';

                function openSevaModal(type) {
                    selectedSevaType = type;
                    currentSevaStep = 1;
                    
                    const modalTitle = document.getElementById('seva-modal-title');
                    const addressWrapper = document.getElementById('seva-address-wrapper');
                    const gotraWrapper = document.getElementById('seva-gotra-wrapper');

                    // Reset values
                    document.getElementById('seva-pilgrim-name').value = '';
                    document.getElementById('seva-gotra').value = '';
                    document.getElementById('seva-delivery-address').value = '';

                    if (type === 'seva') {
                        modalTitle.innerText = 'Book Divine Pooja Seva';
                        if (addressWrapper) addressWrapper.style.display = 'none';
                        if (gotraWrapper) gotraWrapper.style.display = 'flex';
                    } else if (type === 'prasadam') {
                        modalTitle.innerText = 'Order Sacred Prasadam';
                        if (addressWrapper) addressWrapper.style.display = 'flex';
                        if (gotraWrapper) gotraWrapper.style.display = 'none';
                    } else {
                        modalTitle.innerText = 'Request Blessed Keepsake';
                        if (addressWrapper) addressWrapper.style.display = 'flex';
                        if (gotraWrapper) gotraWrapper.style.display = 'none';
                    }

                    showSevaStep(1);

                    const modal = document.getElementById('seva-booking-modal');
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }

                function closeSevaModal() {
                    const modal = document.getElementById('seva-booking-modal');
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }

                function showSevaStep(stepNum) {
                    currentSevaStep = stepNum;
                    document.querySelectorAll('.seva-step-panel').forEach(el => el.classList.add('hidden'));
                    document.getElementById('seva-step-' + stepNum).classList.remove('hidden');

                    document.querySelectorAll('.seva-stepper-dot').forEach((dot, idx) => {
                        if (idx + 1 < stepNum) {
                            dot.style.background = '#10b981';
                        } else if (idx + 1 === stepNum) {
                            dot.style.background = '#4f46e5';
                        } else {
                            dot.style.background = '#e2e8f0';
                        }
                    });
                }

                function proceedToSevaPayment() {
                    const nameVal = document.getElementById('seva-pilgrim-name').value.trim();
                    if (!nameVal) {
                        alert('Please enter Pilgrim Name.');
                        return;
                    }
                    
                    if ((selectedSevaType === 'prasadam' || selectedSevaType === 'keepsake')) {
                        const addrVal = document.getElementById('seva-delivery-address').value.trim();
                        if (!addrVal) {
                            alert('Please enter Delivery Address.');
                            return;
                        }
                    }

                    showSevaStep(2);
                }

                function simulateSevaPayment() {
                    const btn = document.getElementById('seva-pay-btn');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;margin-right:6px;animation:wcu-pulse 1s infinite">sync</span>Processing Securely...';

                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        
                        const tId = 'DD-' + Math.floor(100000 + Math.random() * 900000);
                        document.getElementById('seva-receipt-id').innerText = tId;

                        const templeSel = document.getElementById('seva-temple-select');
                        const templeName = templeSel.options[templeSel.selectedIndex].text;
                        document.getElementById('seva-receipt-temple').innerText = templeName;

                        const nameVal = document.getElementById('seva-pilgrim-name').value.trim();
                        document.getElementById('seva-receipt-pilgrim').innerText = nameVal;

                        let deity = 'Lord Venkateswara';
                        if (templeSel.value === 'kashi' || templeSel.value === 'kedarnath' || templeSel.value === 'manjunatha') deity = 'Lord Shiva';
                        else if (templeSel.value === 'krishna') deity = 'Lord Krishna';
                        else if (templeSel.value === 'meenakshi') deity = 'Goddess Meenakshi';
                        else if (templeSel.value === 'somnath') deity = 'Lord Somnath';

                        document.getElementById('seva-receipt-blessing').innerText = `May the grace of ${deity} shine upon you and your family!`;

                        showSevaStep(3);
                        triggerConfetti();
                    }, 1200);
                }

                function triggerConfetti() {
                    const container = document.getElementById('seva-confetti-container');
                    if (!container) return;
                    container.innerHTML = '';
                    
                    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                    for (let i = 0; i < 40; i++) {
                        const conf = document.createElement('div');
                        conf.className = 'confetti-particle';
                        conf.style.left = Math.random() * 100 + '%';
                        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
                        conf.style.animationDelay = Math.random() * 0.8 + 's';
                        conf.style.transform = `scale(${Math.random() * 0.6 + 0.6})`;
                        container.appendChild(conf);
                    }
                }
            </script>
            </section>"""

    # Do the regex replacement
    new_content_full = content[:match.start()] + new_content + content[match.end():]
    
    # Save back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content_full)
    
    print("SUCCESS: index.html has been successfully expanded and redesigned with modern premium modules!")

if __name__ == '__main__':
    main()

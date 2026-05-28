// ===== Divya Darshan Temple News Module =====
            form.innerHTML = `
        <div class="py-8 flex flex-col items-center justify-center gap-4 text-center">
            <div class="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center">
                <span class="material-symbols-outlined text-green-500 text-[40px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            </div>
            <h3 class="text-2xl font-extrabold text-slate-800 font-manrope">Thank You, ${name}!</h3>
            <div class="flex">${stars}</div>
            <p class="text-sm text-slate-500 font-semibold">${ratingLabels[rating]}</p>
            ${thoughts ? `<p class="text-sm text-slate-400 italic max-w-xs">"${thoughts}"</p>` : ''}
            <p class="text-slate-500 text-sm max-w-sm">Your feedback has been recorded. May you have a blessed and peaceful journey ahead. 🙏</p>
            <button onclick="resetFeedbackForm()" class="mt-2 px-6 py-2 border-2 border-primary text-primary rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-all">Submit Another</button>
        </div>
    `;
        }

        // ==================== NEWS SYSTEM ====================
        const templeNewsData = [
            {
                id: 1,
                title: "Tirupati Balaji: Record 100,000 Pilgrims Witness 'Garuda Seva' Festival",
                source: "TTD Official",
                time: "3h ago",
                image: "../assets/news/tirupati_garuda.png",
                category: "Events",
                excerpt: "The sacred hills of Tirumala erupted in spiritual fervor as thousands gathered for the spectacular Garuda Seva procession..."
            },
            {
                id: 2,
                title: "Dharmasthala: New Eco-friendly Pilgrim Complex to Open Next Month",
                source: "SDM Media",
                time: "5h ago",
                image: "../assets/news/dharmasthala_eco.png",
                category: "Infrastructure",
                excerpt: "A state-of-the-art pilgrim complex with solar power and zero-waste management is nearing completion at Sri Kshetra Dharmasthala..."
            },
            {
                id: 3,
                title: "Udupi Krishna: Digital Booking System for Special Sevas Now Live",
                source: "Temple Desk",
                time: "1d ago",
                image: "../assets/news/udupi_digital.png",
                category: "Digital",
                excerpt: "Devotees can now book Paryaya Sevas and Annadana contributions through the new mobile-first interface launched today..."
            },
            {
                id: 4,
                title: "Kukke Subramanya: Monsoon Protocols Issued for Safe Temple Access",
                source: "Advisory",
                time: "2d ago",
                image: "../assets/news/kukke_monsoon.png",
                category: "Travel",
                excerpt: "With the monsoon approaching, the temple administration has issued new guidelines for river crossings and early morning rituals..."
            },
            {
                id: 5,
                title: "Sacred Chants: Live Streaming Now Reaches 10 Million Monthly Viewers",
                source: "Analytics",
                time: "1w ago",
                image: "../assets/news/live_stream.png",
                category: "Global",
                excerpt: "The 'Darshan from Home' initiative has crossed a major milestone, connecting millions of global devotees to their roots..."
            }
        ];

        function renderNews() {
            const grid = document.getElementById('news-grid');
            if (!grid) return;

            grid.innerHTML = templeNewsData.map(news => `
        <div class="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col group cursor-pointer">
            <div class="relative h-56 overflow-hidden">
                <img src="${news.image}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${news.title}">
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">${news.category}</div>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <div class="flex items-center gap-2 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span class="material-symbols-outlined text-[14px]">history</span> ${news.time}
                    <span class="mx-1">•</span>
                    <span class="material-symbols-outlined text-[14px]">shield_person</span> ${news.source}
                </div>
                <h3 class="text-xl font-extrabold text-slate-900 leading-tight mb-3 group-hover:text-primary transition-colors">${news.title}</h3>
                <p class="text-sm text-slate-500 font-medium line-clamp-3 mb-6">${news.excerpt}</p>
                <div class="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <span class="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">Read Story <span class="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                    <button class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary/10 hover:text-primary transition-all">
                        <span class="material-symbols-outlined text-[18px]">bookmark</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
        }

        function resetFeedbackForm() {

            selectedRating = 0;
            document.getElementById('feedback-form').innerHTML = `
        <div class="flex flex-col items-center gap-4 py-2">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Tap to Rate Your Experience</p>
            <div class="flex gap-1" id="star-rating-container">
                <span class="star-btn text-slate-200 cursor-pointer transition-all duration-150 select-none" onclick="setRating(1)" onmouseover="hoverRating(1)" onmouseout="resetHover()"><span class="material-symbols-outlined" style="font-size:48px;">star</span></span>
                <span class="star-btn text-slate-200 cursor-pointer transition-all duration-150 select-none" onclick="setRating(2)" onmouseover="hoverRating(2)" onmouseout="resetHover()"><span class="material-symbols-outlined" style="font-size:48px;">star</span></span>
                <span class="star-btn text-slate-200 cursor-pointer transition-all duration-150 select-none" onclick="setRating(3)" onmouseover="hoverRating(3)" onmouseout="resetHover()"><span class="material-symbols-outlined" style="font-size:48px;">star</span></span>
                <span class="star-btn text-slate-200 cursor-pointer transition-all duration-150 select-none" onclick="setRating(4)" onmouseover="hoverRating(4)" onmouseout="resetHover()"><span class="material-symbols-outlined" style="font-size:48px;">star</span></span>
                <span class="star-btn text-slate-200 cursor-pointer transition-all duration-150 select-none" onclick="setRating(5)" onmouseover="hoverRating(5)" onmouseout="resetHover()"><span class="material-symbols-outlined" style="font-size:48px;">star</span></span>
            </div>
            <p id="rating-label" class="text-sm font-semibold h-5" style="color:#94a3b8">Select your rating</p>
        </div>
        <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name <span class="text-slate-300 normal-case font-normal">(optional)</span></label>
            <input type="text" id="feedback-name" placeholder="E.g. Ramesh Kumar" class="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-300" />
        </div>
        <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Share Your Thoughts</label>
            <textarea id="feedback-text" class="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none placeholder:text-slate-300" placeholder="Tell us how we can make your journey more peaceful..." rows="4" maxlength="400" oninput="updateCharCount(this)"></textarea>
            <div class="flex justify-between mt-1.5">
                <p class="text-[10px] text-slate-400">Be descriptive – it helps us improve</p>
                <p id="char-count" class="text-[10px] font-bold" style="color:#94a3b8">0 / 400</p>
            </div>
        </div>
        <button class="w-full py-4 bg-primary text-white rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all flex items-center justify-center gap-2" type="submit">
            <span class="material-symbols-outlined text-[20px]">send</span> Submit Feedback
        </button>
    `;
        }


        // Extra Temples Toggle
        let extrasVisible = false;
        function toggleExtraTemples() {

document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderNews === 'function') {
        renderNews();
    }
});

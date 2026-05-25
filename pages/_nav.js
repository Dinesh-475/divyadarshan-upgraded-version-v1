// Shared nav injector — included by all pages
(function(){
  const path = window.location.pathname;
  const links = [
    {href:'/',icon:'home',label:'Home'},
    {href:'/pages/live-status.html',icon:'sensors',label:'Live Status'},
    {href:'/pages/tickets.html',icon:'confirmation_number',label:'Book Tickets'},
    {href:'/pages/parking.html',icon:'local_parking',label:'Parking'},
    {href:'/pages/news.html',icon:'newspaper',label:'Temple News'},
    {href:'/pages/reflections.html',icon:'auto_stories',label:'Reflections'},
    {href:'/pages/location.html',icon:'location_on',label:'Directions'},
    {href:'/pages/emergency.html',icon:'medical_services',label:'Emergency SOS'},
    {href:'/pages/demo.html',icon:'preview',label:'Demo'},
    {href:'/dashboard/admin_login.html',icon:'shield',label:'Admin'},
  ];
  const isActive = (href) => path === href || (href !== '/' && path.endsWith(href.replace('/pages','pages')));
  document.getElementById('dd-nav-links').innerHTML = links.map(l=>`
    <a href="${l.href}" class="nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm cursor-pointer transition-all ${isActive(l.href)?'bg-orange-50 text-[#E65100] font-bold':'text-slate-500 hover:bg-orange-50 hover:text-[#E65100]'}">
      <span class="material-symbols-outlined">${l.icon}</span>${l.label}
    </a>`).join('');
  document.getElementById('dd-topnav-links').innerHTML = links.slice(1,6).map(l=>`
    <a href="${l.href}" class="text-white/80 hover:text-white text-xs font-semibold transition-colors hidden xl:block">${l.label}</a>`).join('');
})();

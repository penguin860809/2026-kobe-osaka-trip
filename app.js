const ICONS={clear:'☀️',cloud:'🌤️',rain:'🌧️'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iconForCode(code){if(code==null)return ICONS.cloud;if(code<=1)return ICONS.clear;if(code<=3)return ICONS.cloud;return ICONS.rain}
function renderRoute(events){return `<div class="route-flow">${events.map((e,i)=>`<span class="route-item"><a class="route-link" href="${esc(e.mapUrl)}" target="_blank" rel="noopener noreferrer"><span class="route-time">${esc(e.time)}</span>${esc(e.title)}</a>${i<events.length-1?'<span class="route-arrow">→</span>':''}</span>`).join('')}</div>`}
async function refreshWeather(day,article){
 const api=day.weatherApi, fallback=day.weatherDisplay?.averageTemp||'—';
 const temp=article.querySelector('.weather-temp'), icon=article.querySelector('.weather-icon'), status=article.querySelector('.weather-status');
 temp.textContent=fallback; icon.textContent=ICONS.cloud; status.textContent='預報範圍外時顯示參考均溫';
 if(!api)return;
 const url=new URL('https://api.open-meteo.com/v1/gfs');
 url.search=new URLSearchParams({latitude:api.latitude,longitude:api.longitude,daily:'weather_code,temperature_2m_max,temperature_2m_min',timezone:api.timezone||'Asia/Tokyo',forecast_days:'16'}).toString();
 try{
   const res=await fetch(url); if(!res.ok)throw new Error('weather');
   const json=await res.json(); const idx=json.daily?.time?.indexOf(day.date)??-1;
   if(idx>=0){const hi=json.daily.temperature_2m_max[idx],lo=json.daily.temperature_2m_min[idx],avg=Math.round((hi+lo)/2);temp.textContent=`${avg}°C`;icon.textContent=iconForCode(json.daily.weather_code[idx]);status.textContent='API 自動更新';}
 }catch(_){status.textContent='暫時無法更新，點擊查看 tenki.jp';}
}
fetch('trip-data.json').then(r=>r.json()).then(trip=>{
 const nav=document.getElementById('dayNav'),app=document.getElementById('app');
 trip.days.forEach((d,i)=>{
  nav.insertAdjacentHTML('beforeend',`<a href="#day-${d.day}" class="day-tab ${i===0?'active':''}" data-day="${d.day}">D${d.day}　${esc(d.dateLabel)}</a>`);
  const notes=(d.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const weatherUrl=d.weather?.[0]?.url||'https://tenki.jp/';
  app.insertAdjacentHTML('beforeend',`<article class="page ${i===0?'active':''}" id="day-${d.day}">
   <header class="header"><div><div class="dayline"><strong>DAY ${d.day}</strong><span>${esc(d.dateLabel)} (${esc(d.weekday)})</span></div><h1 class="city">${esc(d.title)}</h1></div>
   <a class="weather" href="${esc(weatherUrl)}" target="_blank" rel="noopener noreferrer" aria-label="在 tenki.jp 查看天氣"><span class="weather-icon">🌤️</span><span><div class="weather-temp">${esc(d.weatherDisplay?.averageTemp||'—')}</div><div class="weather-label">日均溫</div><div class="weather-status"></div></span></a></header>
   <section class="section"><h2 class="section-title">活動紀事</h2><div class="route-box">${renderRoute(d.events)}</div></section>
   <div class="info"><div class="info-row"><div class="info-label">住宿</div><div class="info-value">${esc(d.lodging)}</div></div><div class="info-row"><div class="info-label">營業時間</div><div class="info-value">${esc(d.hours)}</div></div></div>
   <section class="notes"><h3>注意事項</h3><ul>${notes}</ul></section></article>`);
  refreshWeather(d,document.getElementById(`day-${d.day}`));
 });
 function select(n){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===`day-${n}`));document.querySelectorAll('.day-tab').forEach(x=>x.classList.toggle('active',x.dataset.day===String(n)));window.scrollTo(0,0)}
 nav.addEventListener('click',e=>{const a=e.target.closest('[data-day]');if(!a)return;e.preventDefault();select(a.dataset.day);history.replaceState(null,'',`#day-${a.dataset.day}`)});
 const m=location.hash.match(/day-(\d+)/);if(m)select(m[1]);
}).catch(()=>{document.getElementById('app').textContent='行程資料載入失敗。';});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

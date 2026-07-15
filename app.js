
const ICONS={clear:'☀️',cloud:'🌤️',rain:'🌧️'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function iconForCode(code){
  if(code==null)return ICONS.cloud;
  if(code<=1)return ICONS.clear;
  if(code<=3)return ICONS.cloud;
  return ICONS.rain;
}

function renderRoute(events){
  return `<div class="route-flow">${events.map((e,i)=>`
    <span class="route-item">
      <a class="route-link" href="${esc(e.mapUrl)}" target="_blank" rel="noopener noreferrer">
        ${e.time?`<span class="route-time">${esc(e.time)}</span>`:''}${esc(e.title)}
      </a>${i<events.length-1?'<span class="route-arrow">→</span>':''}
    </span>`).join('')}</div>`;
}

async function refreshWeather(day,article){
  const api=day.weatherApi;
  const fallback=day.weatherDisplay?.averageTemp||'—';
  const temp=article.querySelector('.weather-temp');
  const icon=article.querySelector('.weather-icon');
  const status=article.querySelector('.weather-status');

  temp.textContent=fallback;
  icon.textContent=ICONS.cloud;
  status.textContent='預報範圍外時顯示參考均溫';
  if(!api)return;

  const url=new URL('https://api.open-meteo.com/v1/gfs');
  url.search=new URLSearchParams({
    latitude:api.latitude,
    longitude:api.longitude,
    daily:'weather_code,temperature_2m_max,temperature_2m_min',
    timezone:api.timezone||'Asia/Tokyo',
    forecast_days:'16'
  }).toString();

  try{
    const res=await fetch(url);
    if(!res.ok)throw new Error('weather');
    const json=await res.json();
    const idx=json.daily?.time?.indexOf(day.date)??-1;
    if(idx>=0){
      const hi=json.daily.temperature_2m_max[idx];
      const lo=json.daily.temperature_2m_min[idx];
      const avg=Math.round((hi+lo)/2);
      temp.textContent=`${avg}°C`;
      icon.textContent=iconForCode(json.daily.weather_code[idx]);
      status.textContent='API 自動更新';
    }
  }catch(_){
    status.textContent='暫時無法更新，點擊查看 tenki.jp';
  }
}

fetch('trip-data.json').then(r=>r.json()).then(trip=>{
  const nav=document.getElementById('dayNav');
  const app=document.getElementById('app');

  trip.days.forEach((d,i)=>{
    if(d.day>=2){
      nav.insertAdjacentHTML('beforeend',`<a href="#day-${d.day}" class="day-tab" data-day="${d.day}">D${d.day}</a>`);
    }
    const notes=(d.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    const weatherUrl=d.weather?.[0]?.url||'https://tenki.jp/';

    app.insertAdjacentHTML('beforeend',`<article class="page" id="day-${d.day}" data-day="${d.day}">
      <header class="header">
        <div>
          <div class="dayline"><strong>DAY ${d.day}</strong><span>${esc(d.dateLabel)} (${esc(d.weekday)})</span></div>
          <h1 class="city">${esc(d.title)}</h1>
        </div>
        <a class="weather" href="${esc(weatherUrl)}" target="_blank" rel="noopener noreferrer" aria-label="在 tenki.jp 查看天氣">
          <span class="weather-icon">🌤️</span>
          <span><div class="weather-temp">${esc(d.weatherDisplay?.averageTemp||'—')}</div><div class="weather-label">日均溫</div><div class="weather-status"></div></span>
        </a>
      </header>
      <section class="section"><h2 class="section-title">活動紀事</h2><div class="route-box">${renderRoute(d.events)}</div></section>
      <div class="info">
        <div class="info-row"><div class="info-label">住宿</div><div class="info-value">${esc(d.lodging)}</div></div>
        <div class="info-row"><div class="info-label">營業時間</div><div class="info-value">${esc(d.hours)}</div></div>
      </div>
      <section class="notes"><h3>注意事項</h3><ul>${notes}</ul></section>
    </article>`);

    refreshWeather(d,document.getElementById(`day-${d.day}`));
  });

  const tabs=[...document.querySelectorAll('.day-tab')];
  const pages=[...document.querySelectorAll('.page')];

  function activateTab(day){
    tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.day===String(day)));
    const active=tabs.find(tab=>tab.dataset.day===String(day));
    active?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }

  nav.addEventListener('click',e=>{
    const tab=e.target.closest('[data-day]');
    if(!tab)return;
    e.preventDefault();
    const target=document.getElementById(`day-${tab.dataset.day}`);
    activateTab(tab.dataset.day);
    target?.scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'',`#day-${tab.dataset.day}`);
  });

  let ticking=false;
  function updateActiveOnScroll(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(()=>{
      const offset=nav.getBoundingClientRect().height+24;
      let current=pages[0];
      for(const page of pages){
        if(page.getBoundingClientRect().top<=offset)current=page;
        else break;
      }
      if(current && Number(current.dataset.day)>=2)activateTab(current.dataset.day);
      ticking=false;
    });
  }
  window.addEventListener('scroll',updateActiveOnScroll,{passive:true});

  const match=location.hash.match(/day-(\d+)/);
  if(match){
    requestAnimationFrame(()=>{
      document.getElementById(`day-${match[1]}`)?.scrollIntoView({block:'start'});
      if(Number(match[1])>=2)activateTab(match[1]);
    });
  } else {
    activateTab(2);
  }
}).catch(()=>{
  document.getElementById('app').textContent='行程資料載入失敗。';
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
}

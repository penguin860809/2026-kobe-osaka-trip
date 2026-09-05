
const ICONS={clear:'☀️',cloud:'🌤️',rain:'🌧️'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function iconForCode(code){
  if(code==null)return ICONS.cloud;
  if(code<=1)return ICONS.clear;
  if(code<=3)return ICONS.cloud;
  return ICONS.rain;
}

function renderRoute(events){
  return `<div class="route-flow">${events.map((e,i)=>{
    const m=e.bookingImg?String(e.title).match(/^(.*?)(\(已訂\))$/):null;
    const title=m?m[1]:e.title;
    const booking=m?`<a class="route-link route-booking" href="${esc(e.bookingImg)}" data-lightbox="1" aria-label="查看訂位資訊">${esc(m[2])}</a>`:'';
    return `
    <span class="route-item">
      <a class="route-link" href="${esc(e.mapUrl)}" target="_blank" rel="noopener noreferrer">
        ${e.time?`<span class="route-time">${esc(e.time)}</span>`:''}${esc(title)}
      </a>${booking}${i<events.length-1?'<span class="route-arrow">→</span>':''}
    </span>`}).join('')}</div>`;
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

const toMin=s=>{const m=String(s).match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null};
function renderTable(t){
  const th=t.head.map(h=>`<th>${esc(h).replace(/\n/g,'<br>')}</th>`).join('');
  const from=t.boldFrom?toMin(t.boldFrom):null;
  const rows=t.rows.map(r=>`<tr>${r.map((c,i)=>{const m=toMin(c);const b=(from!=null&&m!=null&&m>=from)||(t.boldFirst&&i===0);return `<td class="${b?'tt-bold':''}">${esc(c).replace(/\n/g,'<br>')}</td>`}).join('')}</tr>`).join('');
  return `<div class="tt-table-wrap">
    ${t.caption?`<div class="tt-caption">${esc(t.caption)}</div>`:''}
    <div class="tt-scroll"><table class="tt-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

function renderTimetables(tt){
  const sections=(tt.sections||[]).map(s=>`<section class="section tt-section">
      <h2 class="section-title"><a class="tt-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}<span class="tt-ext">↗</span></a></h2>
      ${s.subtitle?`<div class="tt-subtitle">${esc(s.subtitle)}</div>`:''}
      <div class="route-box tt-box">
        <div class="tt-grid${s.stack?' tt-stack':''}">${(s.tables||[]).map(renderTable).join('')}</div>
        ${(s.notes||[]).length?`<ul class="tt-notes">${s.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
        ${(s.images||[]).map(im=>`<a class="tt-img-link" href="${esc(im.src)}" data-lightbox="1"><img class="tt-img" src="${esc(im.src)}" alt="${esc(im.alt||'')}" loading="lazy"></a>`).join('')}
      </div>
    </section>`).join('');
  return `<article class="page" id="${esc(tt.id)}" data-day="${esc(tt.id)}">
    <header class="header">
      <div>
        <div class="dayline"><strong>TIMETABLE</strong></div>
        <h1 class="city">${esc(tt.title)}</h1>
      </div>
    </header>
    ${sections}
  </article>`;
}

function openLightbox(src,alt){
  let box=document.getElementById('lightbox');
  if(!box){
    box=document.createElement('div');
    box.id='lightbox';
    box.className='lightbox';
    box.innerHTML='<button class="lightbox-close" aria-label="關閉">✕</button><img class="lightbox-img" alt="">';
    box.addEventListener('click',()=>{box.classList.remove('open');document.body.classList.remove('no-scroll')});
    document.body.appendChild(box);
  }
  const img=box.querySelector('.lightbox-img');
  img.src=src;img.alt=alt||'';
  box.classList.add('open');
  document.body.classList.add('no-scroll');
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[data-lightbox]');
  if(!a)return;
  e.preventDefault();
  openLightbox(a.getAttribute('href'),a.getAttribute('aria-label')||a.querySelector('img')?.alt);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('lightbox')?.classList.remove('open')});

const SHOP_KEY='kobe-shop-checked';
function loadChecked(){try{return JSON.parse(localStorage.getItem(SHOP_KEY)||'{}')}catch(_){return {}}}
function saveChecked(o){try{localStorage.setItem(SHOP_KEY,JSON.stringify(o))}catch(_){}}

function renderShopping(sh){
  const people=(sh.people||[]).map(p=>`<section class="section shop-person">
      <h2 class="section-title">${esc(p.name)}</h2>
      ${(p.groups||[]).map(g=>`<div class="shop-group">
        <div class="shop-group-name">${esc(g.name)}</div>
        <div class="shop-grid">${(g.items||[]).map(it=>`
          <div class="shop-item" data-key="${esc(it.key)}" role="checkbox" aria-checked="false" tabindex="0">
            <div class="shop-img${it.img2?' shop-img-dual':''}"><img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy">${it.img2?`<img src="${esc(it.img2)}" alt="${esc(it.name)}" loading="lazy">`:''}<span class="shop-check">✓</span></div>
            <div class="shop-name">${it.url?`<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.name)}</a>`:esc(it.name)}</div>
            ${it.note?`<div class="shop-note">${esc(it.note)}</div>`:''}
          </div>`).join('')}</div>
      </div>`).join('')}
    </section>`).join('');
  return `<article class="page" id="${esc(sh.id)}" data-day="${esc(sh.id)}">
    <header class="header">
      <div>
        <div class="dayline"><strong>SHOPPING</strong></div>
        <h1 class="city">${esc(sh.title)}</h1>
      </div>
    </header>
    ${people}
  </article>`;
}

function initShopping(){
  const checked=loadChecked();
  const items=[...document.querySelectorAll('.shop-item')];
  if(!items.length)return;
  const apply=el=>{const on=!!checked[el.dataset.key];el.classList.toggle('done',on);el.setAttribute('aria-checked',on?'true':'false')};
  items.forEach(apply);
  const toggle=el=>{checked[el.dataset.key]=!checked[el.dataset.key];if(!checked[el.dataset.key])delete checked[el.dataset.key];saveChecked(checked);apply(el)};
  document.addEventListener('click',e=>{
    if(e.target.closest('a'))return;
    const el=e.target.closest('.shop-item');
    if(el)toggle(el);
  });
  document.addEventListener('keydown',e=>{
    if(e.key!==' '&&e.key!=='Enter')return;
    const el=e.target.closest?.('.shop-item');
    if(el){e.preventDefault();toggle(el)}
  });
}

fetch('trip-data.json').then(r=>r.json()).then(trip=>{
  const nav=document.getElementById('dayNav');
  const app=document.getElementById('app');

  trip.days.forEach((d,i)=>{
    nav.insertAdjacentHTML('beforeend',`<a href="#day-${d.day}" class="day-tab" data-day="${d.day}">${esc(d.dateLabel)}</a>`);
    const notes=(d.notes||[]).map(x=>typeof x==='object'?`<li class="${x.cont?'cont':''}">${esc(x.text)}</li>`:`<li>${esc(x)}</li>`).join('');
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
      <section class="section"><div class="route-box">${renderRoute(d.events)}</div></section>
      <div class="info">
        <div class="info-row"><div class="info-label">住宿</div><div class="info-value">${esc(d.lodging)}</div></div>
        <div class="info-row"><div class="info-label">營業時間</div><div class="info-value">${esc(d.hours)}</div></div>
      </div>
      <section class="notes"><h3>注意事項</h3><ul>${notes}</ul></section>
    </article>`);

    refreshWeather(d,document.getElementById(`day-${d.day}`));
  });

  const extras=[];
  if(trip.timetables)extras.push({data:trip.timetables,render:renderTimetables});
  if(trip.shopping)extras.push({data:trip.shopping,render:renderShopping});
  extras.forEach(({data,render})=>{
    nav.insertAdjacentHTML('beforeend',`<a href="#${esc(data.id)}" class="day-tab" data-day="${esc(data.id)}">${esc(data.label)}</a>`);
    app.insertAdjacentHTML('beforeend',render(data));
  });
  initShopping();

  const tabs=[...document.querySelectorAll('.day-tab')];
  const pages=[...document.querySelectorAll('.page')];
  const pageId=key=>/^\d+$/.test(String(key))?`day-${key}`:String(key);
  const hasTab=key=>tabs.some(tab=>tab.dataset.day===String(key));

  function activateTab(day){
    tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.day===String(day)));
    const active=tabs.find(tab=>tab.dataset.day===String(day));
    active?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }

  nav.addEventListener('click',e=>{
    const tab=e.target.closest('[data-day]');
    if(!tab)return;
    e.preventDefault();
    const target=document.getElementById(pageId(tab.dataset.day));
    activateTab(tab.dataset.day);
    target?.scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'',`#${pageId(tab.dataset.day)}`);
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
      if(current && hasTab(current.dataset.day))activateTab(current.dataset.day);
      ticking=false;
    });
  }
  window.addEventListener('scroll',updateActiveOnScroll,{passive:true});

  const match=location.hash.match(/day-(\d+)/);
  if(match){
    requestAnimationFrame(()=>{
      document.getElementById(`day-${match[1]}`)?.scrollIntoView({block:'start'});
      if(hasTab(match[1]))activateTab(match[1]);
    });
  } else if(extras.some(x=>location.hash===`#${x.data.id}`)){
    const id=location.hash.slice(1);
    requestAnimationFrame(()=>{
      document.getElementById(id)?.scrollIntoView({block:'start'});
      activateTab(id);
    });
  } else {
    activateTab(trip.days[0]?.day??1);
  }
}).catch(()=>{
  document.getElementById('app').textContent='行程資料載入失敗。';
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
}

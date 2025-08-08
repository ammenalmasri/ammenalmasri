// Drive config
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');

let currentExpander = null;

// Utils
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const trimExt = (name) => { const i = name.lastIndexOf('.'); return i>0 ? name.slice(0,i) : name; };
const fmtDate = (iso) => new Date(iso).toLocaleDateString('ar-JO', { year:'numeric', month:'long', day:'numeric' });

// Reveal animation for cards
const revealObserver = new IntersectionObserver((entries)=>{
  for(const e of entries){ if(e.isIntersecting){ e.target.classList.add('revealed'); revealObserver.unobserve(e.target); } }
},{threshold:.1});

// Fetch videos
async function listVideos(){
  let pageToken, all=[];
  const q = `'${FOLDER_ID}' in parents and mimeType contains 'video/' and trashed=false`;
  const fields = 'files(id,name,mimeType,modifiedTime,thumbnailLink),nextPageToken';
  while(true){
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', fields);
    url.searchParams.set('orderBy', 'modifiedTime desc');
    if(pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', API_KEY);

    const res = await fetch(url.toString());
    if(!res.ok) throw new Error('Drive API error');
    const data = await res.json();
    all = all.concat(data.files || []);
    if(!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return all;
}

// Build card
function makeCard(file){
  const card = document.createElement('div');
  card.className = 'card';
  const thumb = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`;
  const title = trimExt(file.name);
  const dateTxt = fmtDate(file.modifiedTime);
  card.innerHTML = `
    <img class="thumb" src="${thumb}" alt="${title}" loading="lazy">
    <div class="meta">
      <div class="title" title="${title}">${title}</div>
      <div class="date">${dateTxt}</div>
    </div>
  `;
  card.addEventListener('click', () => openExpander(file, card));
  revealObserver.observe(card);
  return card;
}

// Open inline player expander
function openExpander(file, afterNode){
  // close previous
  if(currentExpander){
    currentExpander.querySelector('video')?.pause();
    currentExpander.remove();
    currentExpander = null;
  }
  const exp = document.createElement('div');
  exp.className = 'expander';
  exp.innerHTML = `
    <div class="player-bar">
      <div class="player-title" title="${trimExt(file.name)}">${trimExt(file.name)}</div>
      <div class="player-actions">
        <button class="icon-btn fs-btn" title="ملء الشاشة">📺</button>
        <button class="icon-btn close-btn" title="إغلاق">✕</button>
      </div>
    </div>
    <div class="player-wrap">
      <div class="loader"></div>
    </div>
  `;
  afterNode.insertAdjacentElement('afterend', exp);
  currentExpander = exp;
  exp.scrollIntoView({behavior:'smooth', block:'center'});

  const wrap = exp.querySelector('.player-wrap');
  const loader = exp.querySelector('.loader');
  const fsBtn = exp.querySelector('.fs-btn');
  const closeBtn = exp.querySelector('.close-btn');

  if(isIOS()){
    // iOS -> use preview iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://drive.google.com/file/d/${file.id}/preview`;
    iframe.allow = "autoplay; fullscreen";
    iframe.setAttribute('allowfullscreen','');
    wrap.appendChild(iframe);
    loader.remove();
    // fullscreen not consistent for iframe on iOS; hide the button
    fsBtn.style.display = 'none';
  }else{
    // Other devices -> HTML5 video with direct media
    const video = document.createElement('video');
    video.src = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline','');
    video.preload = 'metadata';
    wrap.appendChild(video);
    video.addEventListener('canplay', ()=> loader.remove(), { once:true });
    // Do not auto-play to respect user; they can press Play
    fsBtn.addEventListener('click', () => {
      if(video.requestFullscreen) video.requestFullscreen();
      else if(video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
  }

  closeBtn.addEventListener('click', () => {
    exp.querySelector('video')?.pause();
    exp.remove();
    currentExpander = null;
    afterNode.scrollIntoView({behavior:'smooth', block:'center'});
  });
}

// Render grid
function render(files){
  grid.innerHTML='';
  if(!files.length){ statusMsg.textContent = 'لا توجد فيديوهات حالياً.'; return; }
  statusMsg.textContent='';
  for(const f of files) grid.appendChild(makeCard(f));
}

// Refresh
async function refresh(){
  statusMsg.textContent = 'جاري تحميل الفيديوهات...';
  try{
    const files = await listVideos();
    render(files);
    statusMsg.textContent = '';
  }catch(e){
    console.error(e);
    statusMsg.textContent = 'تعذر تحميل المعرض. تأكد من صلاحيات المجلد و الـ API Key.';
  }
}

refreshBtn.addEventListener('click', refresh);
refresh();

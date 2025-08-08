// Portfolio – videos from Google Drive with robust playback
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

const gallery = document.getElementById('gallery');
const statusEl = document.getElementById('status');
const lightbox = document.getElementById('lightbox');
const player = document.getElementById('player');
const captionTitle = document.getElementById('captionTitle');
const btnClose = document.getElementById('lbClose');
const btnPrev = document.getElementById('lbPrev');
const btnNext = document.getElementById('lbNext');

let files = [];
let current = 0;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const trimExt = (n) => { const i = n.lastIndexOf('.'); return i>0 ? n.slice(0,i) : n; };
const fmtDate = (iso) => new Date(iso).toLocaleDateString('ar-JO', {year:'numeric', month:'long', day:'numeric'});

async function fetchVideos(){
  statusEl.textContent = 'جاري تحميل الفيديوهات...';
  try{
    let pageToken, all = [];
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
    files = all;
    renderGallery();
    statusEl.textContent = '';
  }catch(e){
    console.error(e);
    statusEl.textContent = 'تعذر تحميل المعرض. تأكد من صلاحيات المجلد ومفتاح الـ API.';
  }
}

function renderGallery(){
  gallery.innerHTML = '';
  for(const f of files){
    const card = document.createElement('div');
    card.className = 'card';
    const title = trimExt(f.name);
    const thumb = f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}`;
    card.innerHTML = `
      <img class="thumb" src="${thumb}" alt="${title}" loading="lazy">
      <div class="meta">
        <div class="title" title="${title}">${title}</div>
        <div class="date">${fmtDate(f.modifiedTime)}</div>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(files.indexOf(f)));
    gallery.appendChild(card);
  }
}

function openLightbox(index){
  current = index;
  loadCurrent();
  lightbox.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(){
  lightbox.setAttribute('aria-hidden','true');
  cleanupPlayer();
  document.body.style.overflow = '';
}

function cleanupPlayer(){
  player.innerHTML = '';
}

function loadCurrent(){
  cleanupPlayer();
  const f = files[current];
  captionTitle.textContent = trimExt(f.name);
  if(isIOS()){
    const iframe = document.createElement('iframe');
    iframe.src = `https://drive.google.com/file/d/${f.id}/preview`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.setAttribute('allowfullscreen','');
    player.appendChild(iframe);
  }else{
    const video = document.createElement('video');
    video.src = `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${API_KEY}`;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('webkit-playsinline','');
    player.appendChild(video);
  }
}

function next(){ if(!files.length) return; current = (current+1)%files.length; loadCurrent(); }
function prev(){ if(!files.length) return; current = (current-1+files.length)%files.length; loadCurrent(); }

btnNext.addEventListener('click', next);
btnPrev.addEventListener('click', prev);
btnClose.addEventListener('click', closeLightbox);

document.addEventListener('keydown',(e)=>{
  if(lightbox.getAttribute('aria-hidden')==='false'){
    if(e.key==='Escape') closeLightbox();
    else if(e.key==='ArrowRight') next();
    else if(e.key==='ArrowLeft') prev();
  }
});

let touchStartX = 0;
lightbox.addEventListener('touchstart',(e)=>{ touchStartX = e.changedTouches[0].clientX; }, {passive:true});
lightbox.addEventListener('touchend',(e)=>{
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx) > 40){ if(dx<0) next(); else prev(); }
}, {passive:true});

fetchVideos();

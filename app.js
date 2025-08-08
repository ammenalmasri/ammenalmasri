// إعدادات Google Drive
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');

let currentExpander = null;

// Reveal cards animation
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObserver.unobserve(e.target);
    }
  }
}, { threshold: .1 });

// Tools
function trimExt(name){ const i = name.lastIndexOf('.'); return i>0 ? name.slice(0,i) : name; }

// Fetch Drive videos
async function listAllVideos(){
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
    if(!res.ok) throw new Error('فشل الاتصال بخدمة Google Drive');
    const data = await res.json();
    all = all.concat(data.files || []);
    if(!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return all;
}

// Inline expander
function openExpander(file, afterNode){
  // Close previous expander
  if(currentExpander){
    const v = currentExpander.querySelector('video');
    if(v){ v.pause(); v.removeAttribute('src'); }
    currentExpander.remove();
    currentExpander = null;
  }
  const exp = document.createElement('div');
  exp.className = 'expander';
  exp.innerHTML = `
    <div class="bar">
      <div class="title">${trimExt(file.name)}</div>
      <button class="close" aria-label="إغلاق">✕</button>
    </div>
    <div class="wrap">
      <video controls playsinline webkit-playsinline preload="metadata"></video>
      <div class="loader"></div>
    </div>
  `;
  // insert after the clicked card
  afterNode.insertAdjacentElement('afterend', exp);
  currentExpander = exp;

  const video = exp.querySelector('video');
  const loader = exp.querySelector('.loader');
  const closeBtn = exp.querySelector('.close');

  const directUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
  video.src = directUrl;
  video.addEventListener('canplay', () => loader.remove(), { once:true });
  video.play().catch(()=>{});

  closeBtn.addEventListener('click', () => {
    video.pause(); video.removeAttribute('src');
    exp.remove(); currentExpander = null;
    afterNode.scrollIntoView({behavior:'smooth', block:'center'});
  });

  // Ensure the expander spans full width and scroll into view
  exp.scrollIntoView({behavior:'smooth', block:'center'});
}

// Build grid
function renderGrid(files){
  grid.innerHTML = '';
  if(!files.length){ statusMsg.textContent = 'لا توجد فيديوهات حالياً.'; return; }
  statusMsg.textContent = '';
  for(const f of files){
    const card = document.createElement('div');
    card.className = 'card';
    const thumb = f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}`;
    const title = trimExt(f.name);
    const dateTxt = new Date(f.modifiedTime).toLocaleDateString('ar-JO',{year:'numeric',month:'long',day:'numeric'});
    card.innerHTML = `
      <img class="thumb" src="${thumb}" alt="${title}" loading="lazy">
      <div class="info">
        <h3 title="${title}">${title}</h3>
        <small>${dateTxt}</small>
      </div>
    `;
    card.addEventListener('click', () => openExpander(f, card));
    grid.appendChild(card);
    revealObserver.observe(card);
  }
}

// Refresh
async function refresh(){
  statusMsg.textContent = 'جاري التحميل...';
  try{
    const files = await listAllVideos();
    renderGrid(files);
    statusMsg.textContent = '';
  }catch(err){
    statusMsg.textContent = 'حدث خطأ أثناء جلب البيانات.';
    console.error(err);
  }
}

refreshBtn.addEventListener('click', refresh);
refresh();

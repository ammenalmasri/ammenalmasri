// إعدادات Google Drive
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');

// Inline video player (hidden by default)
const inlinePlayer = document.getElementById('inlinePlayer');
const videoEl = document.getElementById('videoEl');
const nowTitle = document.getElementById('nowTitle');
const closePlayer = document.getElementById('closePlayer');
const videoLoader = document.getElementById('videoLoader');
const videoError = document.getElementById('videoError');

// Reveal cards animation
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObserver.unobserve(e.target);
    }
  }
}, { threshold: .1 });

// Clean up player
function hidePlayer(){
  videoEl.pause();
  videoEl.removeAttribute('src');
  inlinePlayer.hidden = true;
}

// Handle errors
function onVideoError(){
  videoLoader.hidden = true;
  videoError.hidden = false;
}

// Play inline with better performance on mobile
function playInline(file){
  const directUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
  nowTitle.textContent = trimExt(file.name);
  videoError.hidden = true;
  inlinePlayer.hidden = false;
  videoLoader.hidden = false;
  videoEl.src = directUrl;
  // iOS performance tips
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('webkit-playsinline', '');
  videoEl.load();
  videoEl.play().catch(()=>{});

  // hide loader when can play
  const onCanPlay = () => { videoLoader.hidden = true; videoEl.removeEventListener('canplay', onCanPlay); };
  videoEl.addEventListener('canplay', onCanPlay, { once:true });
}

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
    card.addEventListener('click', () => playInline(f));
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

closePlayer.addEventListener('click', hidePlayer);
videoEl.addEventListener('error', onVideoError);

refreshBtn.addEventListener('click', refresh);
refresh();

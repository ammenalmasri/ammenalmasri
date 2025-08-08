// إعدادات Google Drive
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');
const fsVideo = document.getElementById('fsVideo');

// إظهار البطاقات بحركة لطيفة عند الظهور
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObserver.unobserve(e.target);
    }
  }
}, { threshold: .1 });

// تنظيف مشغل الـ Fullscreen عند الخروج
function handleFsExit() {
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  if (!isFs) {
    fsVideo.pause();
    fsVideo.removeAttribute('src');
    fsVideo.style.display = 'none';
  }
}
document.addEventListener('fullscreenchange', handleFsExit);
document.addEventListener('webkitfullscreenchange', handleFsExit);

// أدوات
function trimExt(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

// جلب الفيديوهات من Drive
async function listAllVideos() {
  let pageToken;
  let all = [];
  const q = `'${FOLDER_ID}' in parents and mimeType contains 'video/' and trashed=false`;
  const fields = 'files(id,name,mimeType,modifiedTime,thumbnailLink),nextPageToken';

  while (true) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', fields);
    url.searchParams.set('orderBy', 'modifiedTime desc');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('فشل الاتصال بخدمة Google Drive');
    const data = await res.json();
    all = all.concat(data.files || []);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return all;
}

// تشغيل الفيديو بوضع ملء الشاشة باستخدام رابط alt=media (أنسب للآيفون)
function playFullscreen(file) {
  const directUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
  fsVideo.src = directUrl;
  fsVideo.style.display = 'block';
  // تشغيل ثم طلب ملء الشاشة داخل حدث المستخدم
  fsVideo.play().then(async () => {
    try {
      if (fsVideo.requestFullscreen) await fsVideo.requestFullscreen();
      else if (fsVideo.webkitRequestFullscreen) await fsVideo.webkitRequestFullscreen();
    } catch (e) {
      console.warn('تعذّر الدخول لملء الشاشة:', e);
    }
  }).catch(err => console.error('تعذر تشغيل الفيديو:', err));
}

// بناء الشبكة
function renderGrid(files) {
  grid.innerHTML = '';
  if (!files.length) { statusMsg.textContent = 'لا توجد فيديوهات حالياً.'; return; }
  statusMsg.textContent = '';

  for (const f of files) {
    const card = document.createElement('div');
    card.className = 'card';
    const thumb = f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}`;
    const title = trimExt(f.name);
    const dateTxt = new Date(f.modifiedTime).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' });

    card.innerHTML = `
      <img class="thumb" src="${thumb}" alt="${title}" loading="lazy">
      <div class="info">
        <h3 title="${title}">${title}</h3>
        <small>${dateTxt}</small>
      </div>
    `;
    // تشغيل ملء الشاشة مباشرة على النقرة (متوافق مع iOS)
    card.addEventListener('click', () => playFullscreen(f));
    grid.appendChild(card);
    revealObserver.observe(card);
  }
}

// تحديث المعرض
async function refresh() {
  statusMsg.textContent = 'جاري التحميل...';
  try {
    const files = await listAllVideos();
    renderGrid(files);
    statusMsg.textContent = '';
  } catch (err) {
    statusMsg.textContent = 'حدث خطأ أثناء جلب البيانات.';
    console.error(err);
  }
}

refreshBtn.addEventListener('click', refresh);
refresh();

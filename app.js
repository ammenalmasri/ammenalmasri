// إعدادات Google Drive
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');

// حاوية ملء الشاشة
const fsContainer = document.getElementById('fsContainer');
const fsPlayer = document.getElementById('fsPlayer');

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
    // تشغيل بوضع ملء الشاشة عند النقر
    card.addEventListener('click', () => playFullscreen(f));
    grid.appendChild(card);
  }
}

// تشغيل ملء الشاشة
async function playFullscreen(file) {
  const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;
  fsPlayer.src = previewUrl;

  // طلب ملء الشاشة على الحاوية (أفضل توافقاً)
  try {
    if (fsContainer.requestFullscreen) {
      await fsContainer.requestFullscreen();
    } else if (fsContainer.webkitRequestFullscreen) {
      await fsContainer.webkitRequestFullscreen();
    } else if (fsPlayer.requestFullscreen) {
      await fsPlayer.requestFullscreen();
    }
  } catch (e) {
    // بعض المتصفحات قد ترفض الطلب؛ في هذه الحالة سيبقى iframe ضمن الصفحة
    console.warn('لم ينجح الدخول لملء الشاشة:', e);
  }
}

// تنظيف عند الخروج من وضع ملء الشاشة
function onFsChange() {
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  if (!isFs) {
    // تم الخروج من ملء الشاشة — ننظف المصدر لإيقاف التشغيل
    fsPlayer.src = '';
  }
}
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

// تحديث
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

// جلب إعدادات Google Drive
const { FOLDER_ID, API_KEY } = window.DRIVE_CONFIG;

// عناصر DOM
const grid = document.getElementById('videoGrid');
const statusMsg = document.getElementById('statusMsg');
const refreshBtn = document.getElementById('refreshBtn');

// مشغل داخل الصفحة (مخفي بالبداية)
const playerSection = document.getElementById('playerSection');
const playerTitle = document.getElementById('playerTitle');
const drivePlayer = document.getElementById('drivePlayer');

// أداة لإزالة الامتداد من الاسم
function trimExt(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

// استدعاء Drive API مع التعامل مع الصفحات
async function listAllVideos() {
  let pageToken = undefined;
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
    if (!res.ok) throw new Error('فشل الاتصال بواجهات Google Drive');
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
  if (!files.length) {
    statusMsg.textContent = 'لا توجد فيديوهات حالياً.';
    return;
  }
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
    card.addEventListener('click', () => playInline(f));
    grid.appendChild(card);
  }
}

// تشغيل داخل الصفحة (بدون تشغيل تلقائي عند فتح الموقع)
function playInline(file) {
  const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;
  playerTitle.textContent = trimExt(file.name);
  drivePlayer.src = previewUrl; // لا نضيف autoplay => المستخدم هو من بدأ التشغيل
  if (playerSection.style.display === 'none') {
    playerSection.style.display = 'block';
  }
  // التمرير للمشغل ليتصدر الشاشة
  playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// إعادة تحميل
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

// تحميل أولي للشبكة فقط (بدون تشغيل تلقائي)
refresh();

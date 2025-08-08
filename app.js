// إعدادات Google Drive
const FOLDER_ID = "1G174hSyhGDWpUCVaLyShGn1DtvwKehw3";
const API_KEY = "AIzaSyAoSGkHZnJUPF1QX7or6mhLIhpNOkk-mig";

const gallery = document.getElementById("gallery");
const videoPlayer = document.getElementById("videoPlayer");
const videoContainer = document.getElementById("videoContainer");
const closeBtn = document.getElementById("closeBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

// كشف iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// جلب الفيديوهات
async function fetchVideos() {
  const q = `'${FOLDER_ID}' in parents and mimeType contains 'video/' and trashed=false`;
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink),nextPageToken');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('key', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error('Drive API error', await res.text());
    return;
  }
  const data = await res.json();
  (data.files || []).forEach(file => addThumb(file));
}

function addThumb(file) {
  const thumbUrl = file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}`;
  const div = document.createElement("div");
  div.className = "video-thumb";
  div.innerHTML = `<img src="${thumbUrl}" alt="${file.name}" loading="lazy">`;
  div.addEventListener("click", () => play(file));
  gallery.appendChild(div);
}

// تشغيل الفيديو
function play(file) {
  videoPlayer.classList.remove("hidden");
  videoContainer.innerHTML = ""; // تفريغ
  // iOS: استخدم preview داخل iframe
  if (isIOS()) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://drive.google.com/file/d/${file.id}/preview`;
    iframe.allow = "autoplay; fullscreen";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("webkitallowfullscreen", "");
    iframe.setAttribute("mozallowfullscreen", "");
    videoContainer.appendChild(iframe);
    fullscreenBtn.style.display = "none"; // iframe ما يدعم طلب fullscreen موحد
  } else {
    const video = document.createElement("video");
    video.src = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
    video.controls = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "true");
    video.preload = "metadata";
    videoContainer.appendChild(video);
    fullscreenBtn.style.display = "inline-block";
    // تشغيل اختياري: المستخدم يضغط Play من الكنترولز
  }

  // تمرير للمشغل
  videoPlayer.scrollIntoView({ behavior: "smooth", block: "start" });
}

// إغلاق المشغل
closeBtn.addEventListener("click", () => {
  videoContainer.innerHTML = "";
  videoPlayer.classList.add("hidden");
});

// ملء الشاشة
fullscreenBtn.addEventListener("click", () => {
  const video = videoContainer.querySelector("video");
  if (!video) return;
  if (video.requestFullscreen) video.requestFullscreen();
  else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
});

fetchVideos();

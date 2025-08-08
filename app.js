const folderId = "1G174hSyhGDWpUCVaLyShGn1DtvwKehw3";
const apiKey = "AIzaSyAoSGkHZnJUPF1QX7or6mhLIhpNOkk-mig";

const gallery = document.getElementById("gallery");
const videoPlayer = document.getElementById("videoPlayer");
const videoContainer = document.getElementById("videoContainer");
const closeBtn = document.getElementById("closeBtn");

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

async function fetchVideos() {
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink)`;
    const res = await fetch(url);
    const data = await res.json();

    data.files.forEach(file => {
        if (file.mimeType.startsWith("video/")) {
            const thumb = file.thumbnailLink || "placeholder.jpg";
            const div = document.createElement("div");
            div.classList.add("video-thumb");
            div.innerHTML = `<img src="${thumb}" alt="${file.name}"><p>${file.name}</p>`;
            div.addEventListener("click", () => playVideo(file.id));
            gallery.appendChild(div);
        }
    });
}

function playVideo(fileId) {
    videoPlayer.classList.remove("hidden");
    videoContainer.innerHTML = "";

    if (isIOS()) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        iframe.allow = "autoplay; fullscreen";
        iframe.setAttribute("webkitallowfullscreen", "");
        iframe.setAttribute("mozallowfullscreen", "");
        iframe.setAttribute("allowfullscreen", "");
        videoContainer.appendChild(iframe);
    } else {
        const video = document.createElement("video");
        video.src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        videoContainer.appendChild(video);
        video.requestFullscreen?.();
    }
}

closeBtn.addEventListener("click", () => {
    videoContainer.innerHTML = "";
    videoPlayer.classList.add("hidden");
});

fetchVideos();

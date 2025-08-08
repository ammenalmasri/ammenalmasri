const folderId = "1G174hSyhGDWpUCVaLyShGn1DtvwKehw3";
const apiKey = "AIzaSyAoSGkHZnJUPF1QX7or6mhLIhpNOkk-mig";

const gallery = document.getElementById("gallery");
const lightbox = document.getElementById("lightbox");
const videoContainer = document.getElementById("videoContainer");
const closeBtn = document.getElementById("closeBtn");

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

async function fetchVideos() {
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink)`;
    const res = await fetch(url);
    const data = await res.json();

    gallery.innerHTML = "";
    data.files.forEach(file => {
        if (file.mimeType.startsWith("video/")) {
            const div = document.createElement("div");
            div.classList.add("video-thumb");
            div.innerHTML = `
                <img src="${file.thumbnailLink || 'placeholder.jpg'}" alt="${file.name}">
                <p>${file.name}</p>
            `;
            div.addEventListener("click", () => playVideo(file.id));
            gallery.appendChild(div);
        }
    });
}

function playVideo(fileId) {
    lightbox.classList.remove("hidden");
    videoContainer.innerHTML = "";

    if (isIOS()) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        iframe.allowFullscreen = true;
        iframe.width = "100%";
        iframe.height = "500px";
        videoContainer.appendChild(iframe);
    } else {
        const video = document.createElement("video");
        video.src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        video.controls = true;
        video.autoplay = true;
        videoContainer.appendChild(video);
    }
}

closeBtn.addEventListener("click", () => {
    videoContainer.innerHTML = "";
    lightbox.classList.add("hidden");
});

fetchVideos();

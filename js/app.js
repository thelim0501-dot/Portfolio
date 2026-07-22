// ============================================
// Portfolio Builder
// Version 3.0
// ============================================

class PortfolioApp {

    constructor() {

        this.portfolioContainer = document.getElementById("portfolioPages");

        this.prevBtn = document.getElementById("prevBtn");
        this.nextBtn = document.getElementById("nextBtn");
        this.pageNumber = document.getElementById("pageNumber");

        this.viewer = document.getElementById("viewer");
        this.viewerImage = document.getElementById("viewerImage");
        this.viewerPrev = document.getElementById("viewerPrev");
        this.viewerNext = document.getElementById("viewerNext");
        this.viewerCount = document.getElementById("viewerCount");
        this.closeViewer = document.getElementById("closeViewer");

        this.videoViewer = document.getElementById("videoViewer");
        this.videoViewerPlayer = document.getElementById("videoViewerPlayer");
        this.videoViewerLabel = document.getElementById("videoViewerLabel");
        this.videoViewerCount = document.getElementById("videoViewerCount");
        this.videoViewerPrev = document.getElementById("videoViewerPrev");
        this.videoViewerNext = document.getElementById("videoViewerNext");
        this.closeVideoViewer = document.getElementById("closeVideoViewer");

        this.visualizationTab = document.getElementById("visualizationTab");
        this.filmTab = document.getElementById("filmTab");
        this.visualizationCount = document.getElementById("visualizationCount");
        this.filmCount = document.getElementById("filmCount");

        this.pages = [];
        this.projects = [];
        this.currentPage = 0;
        this.currentImageIndex = 0;
        this.currentVideoIndex = 0;
        this.activeMediaType = null;

        this.initialize();

    }

    async initialize() {

        this.bindEvents();

        await this.loadProjects();

        const loaderTitle = document.getElementById("loaderTitle");
        const loaderSelected = document.getElementById("loaderSelected");
        const loader = document.getElementById("loader");
        const app = document.getElementById("app");

        setTimeout(() => {

            loaderTitle.style.animationPlayState = "running";

        }, 300);

        setTimeout(() => {

            loaderSelected.classList.add("show");

        }, 3100);

        setTimeout(() => {

            loader.classList.add("hide");

            app.classList.add("show");

        }, 4300);

    }

    bindEvents() {

        this.prevBtn.addEventListener("click", () => this.previousPage());

        this.nextBtn.addEventListener("click", () => this.nextPage());

        document.addEventListener("keydown", event => this.handleKeyboard(event));

        this.visualizationTab.addEventListener("click", () => this.selectMedia("images"));

        this.filmTab.addEventListener("click", () => this.selectMedia("videos"));

        this.closeViewer.addEventListener("click", () => this.closeImage());

        this.viewer.addEventListener("click", event => {

            if(event.target === this.viewer){

                this.closeImage();

            }

        });

        this.viewerPrev.addEventListener("click", event => {

            event.stopPropagation();

            this.previousImage();

        });

        this.viewerNext.addEventListener("click", event => {

            event.stopPropagation();

            this.nextImage();

        });

        this.closeVideoViewer.addEventListener("click", () => this.closeVideo());

        this.videoViewer.addEventListener("click", event => {

            if(event.target === this.videoViewer){

                this.closeVideo();

            }

        });

        this.videoViewerPrev.addEventListener("click", event => {

            event.stopPropagation();

            this.previousVideo();

        });

        this.videoViewerNext.addEventListener("click", event => {

            event.stopPropagation();

            this.nextVideo();

        });

    }

    async loadProjects() {

        try {

            const response = await fetch("projects.json", { cache: "no-store" });

            if(!response.ok){

                throw new Error("projects.json을 불러오지 못했습니다.");

            }

            const projects = await response.json();

            this.projects = Array.isArray(projects) ? projects : [];

        }

        catch(error) {

            console.error(error);

            this.projects = [];

        }

        this.createPortfolioPages();

        this.updatePage();

    }

    getProject() {

        const project = this.projects[0] || {};

        return {

            ...project,

            images: Array.isArray(project.images) ? project.images.filter(Boolean) : [],

            videos: Array.isArray(project.videos)

                ? project.videos.filter(video => video && video.url)

                : []

        };

    }

    updateMediaTabs() {

        const project = this.getProject();

        const imageMode = this.activeMediaType === "images";

        const videoMode = this.activeMediaType === "videos";

        this.visualizationTab.classList.toggle("active", imageMode);

        this.visualizationTab.setAttribute("aria-selected", String(imageMode));

        this.filmTab.classList.toggle("active", videoMode);

        this.filmTab.setAttribute("aria-selected", String(videoMode));

        this.visualizationCount.textContent = `${project.images.length} IMAGES`;

        this.filmCount.textContent = `${project.videos.length} FILMS`;

    }

    selectMedia(type) {

        this.activeMediaType = type;

        this.createPortfolioPages();

        this.pages = [...document.querySelectorAll(".page")];

        const firstContentPage = this.pages.findIndex(page => {

            return this.portfolioContainer.contains(page);

        });

        this.currentPage = firstContentPage >= 0 ? firstContentPage : 0;

        this.updatePage();

    }

    createPortfolioPages() {

        this.portfolioContainer.innerHTML = "";

        this.updateMediaTabs();

        if(this.activeMediaType === "videos"){

            this.createVideoPages();

        }

        else if(this.activeMediaType === "images") {

            this.createImagePages();

        }

        this.pages = [...document.querySelectorAll(".page")];

    }

    createImagePages() {

        const images = this.getProject().images;

        if(images.length === 0){

            this.createEmptyPage("VISUALIZATION", "등록된 이미지가 없습니다.");

            return;

        }

        const totalPages = Math.ceil(images.length / 4);

        for(let pageIndex = 0; pageIndex < totalPages; pageIndex++){

            const section = document.createElement("section");

            section.className = "page portfolio-page";

            section.dataset.media = "images";

            const gallery = document.createElement("div");

            gallery.className = "gallery";

            const pageImages = images.slice(pageIndex * 4, pageIndex * 4 + 4);

            gallery.classList.add(`count-${pageImages.length}`);

            pageImages.forEach((fileName, itemIndex) => {

                const imageIndex = pageIndex * 4 + itemIndex;

                const box = document.createElement("div");

                box.className = "image-box";

                const image = document.createElement("img");

                image.src = `images/${fileName}`;

                image.alt = fileName.replace(/\.[^/.]+$/, "");

                image.loading = "lazy";

                box.addEventListener("click", () => this.openImage(imageIndex));

                const overlay = document.createElement("div");

                overlay.className = "image-overlay";

                const viewLabel = document.createElement("span");

                viewLabel.textContent = "VIEW";

                const arrow = document.createElement("span");

                arrow.className = "arrow";

                arrow.textContent = "↗";

                overlay.append(viewLabel, arrow);

                box.append(image, overlay);

                gallery.appendChild(box);

            });

            section.appendChild(gallery);

            this.portfolioContainer.appendChild(section);

        }

    }

    getVideoItemsPerPage() {

        return window.matchMedia("(max-width:760px)").matches ? 2 : 4;

    }

    createVideoPages() {

        const videos = this.getProject().videos;

        if(videos.length === 0){

            this.createEmptyPage("FILM", "등록된 영상이 없습니다.");

            return;

        }

        const itemsPerPage = this.getVideoItemsPerPage();

        const totalPages = Math.ceil(videos.length / itemsPerPage);

        for(let pageIndex = 0; pageIndex < totalPages; pageIndex++){

            const section = document.createElement("section");

            section.className = "page portfolio-page video-page";

            section.dataset.media = "videos";

            const gallery = document.createElement("div");

            gallery.className = "film-gallery";

            const pageVideos = videos.slice(

                pageIndex * itemsPerPage,

                pageIndex * itemsPerPage + itemsPerPage

            );

            gallery.classList.add(`count-${pageVideos.length}`);

            pageVideos.forEach((video, itemIndex) => {

                const videoIndex = pageIndex * itemsPerPage + itemIndex;

                const filmNumber = `FILM ${String(videoIndex + 1).padStart(2, "0")}`;

                const card = document.createElement("button");

                card.className = "film-card";

                card.type = "button";

                card.setAttribute("aria-label", `${filmNumber} 재생`);

                card.addEventListener("click", () => this.openVideo(videoIndex));

                const media = document.createElement("span");

                media.className = "film-card-media";

                if(video.poster){

                    const poster = document.createElement("img");

                    poster.src = `images/${encodeURIComponent(video.poster)}`;

                    poster.alt = "";

                    media.appendChild(poster);

                }

                else {

                    const preview = document.createElement("video");

                    preview.src = video.url;

                    preview.muted = true;

                    preview.preload = "metadata";

                    preview.playsInline = true;

                    preview.tabIndex = -1;

                    preview.setAttribute("aria-hidden", "true");

                    preview.addEventListener("loadedmetadata", () => {

                        if(Number.isFinite(preview.duration) && preview.duration > 0){

                            preview.currentTime = Math.min(0.1, preview.duration / 2);

                        }

                    }, { once: true });

                    media.appendChild(preview);

                }

                const shade = document.createElement("span");

                shade.className = "film-card-shade";

                const label = document.createElement("span");

                label.className = "film-card-label";

                label.textContent = filmNumber;

                const playIcon = document.createElement("span");

                playIcon.className = "film-card-play";

                playIcon.setAttribute("aria-hidden", "true");

                playIcon.textContent = "▶";

                shade.append(label, playIcon);

                card.append(media, shade);

                gallery.appendChild(card);

            });

            section.appendChild(gallery);

            this.portfolioContainer.appendChild(section);

        }

    }

    createEmptyPage(category, message) {

        const section = document.createElement("section");

        section.className = "page portfolio-page";

        const empty = document.createElement("div");

        empty.className = "media-empty";

        const title = document.createElement("strong");

        title.textContent = category;

        const description = document.createElement("span");

        description.textContent = message;

        empty.append(title, description);

        section.appendChild(empty);

        this.portfolioContainer.appendChild(section);

    }

    nextPage() {

        if(this.currentPage >= this.pages.length - 1){

            return;

        }

        this.currentPage++;

        this.updatePage();

    }

    previousPage() {

        if(this.currentPage <= 0){

            return;

        }

        this.currentPage--;

        this.updatePage();

    }

    updatePage() {

        this.pages = [...document.querySelectorAll(".page")];

        this.currentPage = Math.max(0, Math.min(this.currentPage, this.pages.length - 1));

        this.pages.forEach((page, index) => {

            const active = index === this.currentPage;

            page.classList.toggle("active", active);

            if(!active){

                page.querySelectorAll("video").forEach(video => video.pause());

            }

        });

        this.pageNumber.textContent =

            `${String(this.currentPage + 1).padStart(2, "0")} / ${String(this.pages.length).padStart(2, "0")}`;

        this.prevBtn.disabled = this.currentPage === 0;

        this.nextBtn.disabled = this.currentPage === this.pages.length - 1;

        const activePage = this.pages[this.currentPage];

        activePage?.querySelectorAll(".image-box, .film-card").forEach((box, index) => {

            box.classList.remove("show");

            setTimeout(() => box.classList.add("show"), index * 120);

        });

    }

    handleKeyboard(event) {

        if(this.videoViewer.classList.contains("show")){

            if(event.key === "Escape"){

                this.closeVideo();

            }

            else if(event.key === "ArrowRight"){

                this.nextVideo();

            }

            else if(event.key === "ArrowLeft"){

                this.previousVideo();

            }

            return;

        }

        if(this.viewer.classList.contains("show")){

            if(event.key === "Escape"){

                this.closeImage();

            }

            else if(event.key === "ArrowRight"){

                this.nextImage();

            }

            else if(event.key === "ArrowLeft"){

                this.previousImage();

            }

            return;

        }

        if(event.target instanceof HTMLVideoElement){

            return;

        }

        if(["ArrowRight", "ArrowDown"].includes(event.key)){

            event.preventDefault();

            this.nextPage();

        }

        else if(["ArrowLeft", "ArrowUp"].includes(event.key)){

            event.preventDefault();

            this.previousPage();

        }

    }

    openVideo(index) {

        const videos = this.getProject().videos;

        if(videos.length === 0){

            return;

        }

        this.currentVideoIndex = index;

        this.updateViewerVideo(videos, true);

        this.videoViewer.classList.add("show");

        this.videoViewer.setAttribute("aria-hidden", "false");

    }

    previousVideo() {

        const videos = this.getProject().videos;

        if(videos.length === 0){

            return;

        }

        this.currentVideoIndex =

            (this.currentVideoIndex - 1 + videos.length) % videos.length;

        this.updateViewerVideo(videos, true);

    }

    nextVideo() {

        const videos = this.getProject().videos;

        if(videos.length === 0){

            return;

        }

        this.currentVideoIndex = (this.currentVideoIndex + 1) % videos.length;

        this.updateViewerVideo(videos, true);

    }

    updateViewerVideo(videos, autoplay = false) {

        const video = videos[this.currentVideoIndex];

        this.videoViewerPlayer.pause();

        this.videoViewerPlayer.src = video.url;

        if(video.poster){

            this.videoViewerPlayer.poster = `images/${encodeURIComponent(video.poster)}`;

        }

        else {

            this.videoViewerPlayer.removeAttribute("poster");

        }

        this.videoViewerLabel.textContent =

            `FILM ${String(this.currentVideoIndex + 1).padStart(2, "0")}`;

        this.videoViewerCount.textContent =

            `${this.currentVideoIndex + 1} / ${videos.length}`;

        this.videoViewerPlayer.load();

        if(autoplay){

            this.videoViewerPlayer.play().catch(() => {});

        }

    }

    closeVideo() {

        this.videoViewer.classList.remove("show");

        this.videoViewer.setAttribute("aria-hidden", "true");

        this.videoViewerPlayer.pause();

        this.videoViewerPlayer.removeAttribute("src");

        this.videoViewerPlayer.removeAttribute("poster");

        this.videoViewerPlayer.load();

    }

    openImage(index) {

        const images = this.getProject().images;

        if(images.length === 0){

            return;

        }

        this.currentImageIndex = index;

        this.viewerImage.src = `images/${images[index]}`;

        this.viewerCount.textContent = `${index + 1} / ${images.length}`;

        this.viewer.classList.add("show");

    }

    previousImage() {

        const images = this.getProject().images;

        if(images.length === 0){

            return;

        }

        this.currentImageIndex =

            (this.currentImageIndex - 1 + images.length) % images.length;

        this.updateViewerImage(images);

    }

    nextImage() {

        const images = this.getProject().images;

        if(images.length === 0){

            return;

        }

        this.currentImageIndex = (this.currentImageIndex + 1) % images.length;

        this.updateViewerImage(images);

    }

    updateViewerImage(images) {

        this.viewerImage.src = `images/${images[this.currentImageIndex]}`;

        this.viewerCount.textContent = `${this.currentImageIndex + 1} / ${images.length}`;

    }

    closeImage() {

        this.viewer.classList.remove("show");

        this.viewerImage.src = "";

    }

}

document.addEventListener("DOMContentLoaded", () => {

    new PortfolioApp();

});

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

        this.visualizationTab = document.getElementById("visualizationTab");
        this.filmTab = document.getElementById("filmTab");
        this.visualizationCount = document.getElementById("visualizationCount");
        this.filmCount = document.getElementById("filmCount");

        this.pages = [];
        this.projects = [];
        this.currentPage = 0;
        this.currentImageIndex = 0;
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

    }

    async loadProjects() {

        try {

            const response = await fetch("projects.json");

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

                image.addEventListener("click", () => this.openImage(imageIndex));

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

    createVideoPages() {

        const videos = this.getProject().videos;

        if(videos.length === 0){

            this.createEmptyPage("FILM", "등록된 영상이 없습니다.");

            return;

        }

        videos.forEach((video, index) => {

            const section = document.createElement("section");

            section.className = "page portfolio-page video-page";

            section.dataset.media = "videos";

            const content = document.createElement("div");

            content.className = "video-page-content";

            const header = document.createElement("div");

            header.className = "video-page-header";

            const pageIndex = document.createElement("span");

            pageIndex.className = "video-page-index";

            pageIndex.textContent = `FILM ${String(index + 1).padStart(2, "0")}`;

            const title = document.createElement("h2");

            title.className = "video-page-title";

            title.textContent = video.title || video.file || `Film ${index + 1}`;

            header.append(pageIndex, title);

            const stage = document.createElement("div");

            stage.className = "video-stage";

            const player = document.createElement("video");

            player.className = "portfolio-video";

            player.src = video.url;

            player.controls = true;

            player.preload = "metadata";

            player.playsInline = true;

            stage.appendChild(player);

            content.append(header, stage);

            section.appendChild(content);

            this.portfolioContainer.appendChild(section);

        });

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

        activePage?.querySelectorAll(".image-box").forEach((box, index) => {

            box.classList.remove("show");

            setTimeout(() => box.classList.add("show"), index * 120);

        });

    }

    handleKeyboard(event) {

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

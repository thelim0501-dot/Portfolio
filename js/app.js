// ============================================
// Portfolio Builder
// Version 3.0
// ============================================

class PortfolioApp {

    constructor() {

        this.app = document.getElementById("app");

        this.portfolioContainer = document.getElementById("portfolioPages");

        this.prevBtn = document.getElementById("prevBtn");
        this.nextBtn = document.getElementById("nextBtn");
        this.pageNumber = document.getElementById("pageNumber");
        this.pageProgress = document.getElementById("pageProgress");
        this.pageProgressBar = document.getElementById("pageProgressBar");
        this.navigation = document.getElementById("navigation");

        this.viewer = document.getElementById("viewer");
        this.viewerImage = document.getElementById("viewerImage");
        this.viewerPrev = document.getElementById("viewerPrev");
        this.viewerNext = document.getElementById("viewerNext");
        this.viewerCount = document.getElementById("viewerCount");
        this.viewerSwipeHint = document.getElementById("viewerSwipeHint");
        this.viewerError = document.getElementById("viewerError");
        this.closeViewer = document.getElementById("closeViewer");

        this.videoViewer = document.getElementById("videoViewer");
        this.videoViewerPlayer = document.getElementById("videoViewerPlayer");
        this.videoViewerLabel = document.getElementById("videoViewerLabel");
        this.videoViewerCount = document.getElementById("videoViewerCount");
        this.videoViewerPrev = document.getElementById("videoViewerPrev");
        this.videoViewerNext = document.getElementById("videoViewerNext");
        this.videoViewerError = document.getElementById("videoViewerError");
        this.closeVideoViewer = document.getElementById("closeVideoViewer");

        this.visualizationTab = document.getElementById("visualizationTab");
        this.filmTab = document.getElementById("filmTab");
        this.visualizationCount = document.getElementById("visualizationCount");
        this.filmCount = document.getElementById("filmCount");

        this.pages = [];
        this.projects = [];
        this.thumbnailMap = {};
        this.viewerMap = {};
        this.preloadedViewerImages = new Set();
        this.categoryVideoPreview = null;
        this.categoryVideoPreviewSrc = "";
        this.currentPage = 0;
        this.currentImageIndex = 0;
        this.currentVideoIndex = 0;
        this.activeMediaType = null;
        this.pageTouchStart = null;
        this.imageTouchStart = null;
        this.imageMouseDrag = null;
        this.imageZoom = 1;
        this.imageTranslateX = 0;
        this.imageTranslateY = 0;
        this.pinchStartDistance = 0;
        this.pinchStartZoom = 1;
        this.suppressImageClick = false;
        this.videoTouchStart = null;
        this.suppressNextCardClick = false;
        this.lastFocusedElement = null;

        this.initialize();

    }

    async initialize() {

        this.bindEvents();

        await this.loadProjects();

        const loaderTitle = document.getElementById("loaderTitle");
        const loaderSelected = document.getElementById("loaderSelected");
        const loader = document.getElementById("loader");
        const app = document.getElementById("app");

        if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){

            loader.classList.add("hide");

            app.classList.add("show");

            return;

        }

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

        document.addEventListener("keydown", event => {

            if(event.key === "Tab"){

                document.documentElement.classList.add("keyboard-navigation");

            }

            this.handleKeyboard(event);

        });

        document.addEventListener("pointerdown", () => {

            document.documentElement.classList.remove("keyboard-navigation");

        }, true);

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

        [
            this.prevBtn,
            this.nextBtn,
            this.viewerPrev,
            this.viewerNext,
            this.closeViewer,
            this.videoViewerPrev,
            this.videoViewerNext,
            this.closeVideoViewer
        ].forEach(button => {

            button.addEventListener("pointerup", event => {

                if(event.pointerType !== "mouse"){

                    button.blur();

                }

            });

        });

        this.app.addEventListener(

            "touchstart",

            event => this.handlePageTouchStart(event),

            { passive: true }

        );

        this.app.addEventListener(

            "touchend",

            event => this.handlePageTouchEnd(event),

            { passive: true }

        );

        this.viewer.addEventListener(

            "touchstart",

            event => this.handleImageTouchStart(event),

            { passive: false }

        );

        this.viewer.addEventListener(

            "touchmove",

            event => this.handleImageTouchMove(event),

            { passive: false }

        );

        this.viewer.addEventListener(

            "touchend",

            event => this.handleImageTouchEnd(event),

            { passive: false }

        );

        this.viewerImage.addEventListener("click", event => {

            event.preventDefault();

            if(this.suppressImageClick){

                this.suppressImageClick = false;
                return;

            }

            this.toggleImageZoom(event.clientX, event.clientY);

        });

        this.viewerImage.addEventListener("dragstart", event => {

            event.preventDefault();

        });

        this.viewerImage.addEventListener("mousedown", event => {

            this.handleImageMouseDown(event);

        });

        window.addEventListener("mousemove", event => {

            this.handleImageMouseMove(event);

        });

        window.addEventListener("mouseup", () => {

            const dragged = Boolean(this.imageMouseDrag?.moved);

            this.stopImageMouseDrag();

            if(dragged){

                this.suppressImageClick = true;

                window.setTimeout(() => {

                    this.suppressImageClick = false;

                }, 0);

            }

        });

        window.addEventListener("blur", () => {

            this.stopImageMouseDrag();

        });

        this.videoViewer.addEventListener(

            "touchstart",

            event => this.handleVideoTouchStart(event),

            { passive: true }

        );

        this.viewerImage.addEventListener("load", () => {

            this.viewer.classList.remove("media-error", "media-loading");

        });

        this.viewerImage.addEventListener("error", () => {

            this.viewer.classList.remove("media-loading");

            this.viewer.classList.add("media-error");

        });

        this.videoViewerPlayer.addEventListener("loadeddata", () => {

            this.videoViewer.classList.remove("media-error");

        });

        this.videoViewerPlayer.addEventListener("error", () => {

            this.videoViewer.classList.add("media-error");

        });

        this.videoViewer.addEventListener(

            "touchend",

            event => this.handleVideoTouchEnd(event),

            { passive: true }

        );

    }

    async loadProjects() {

        try {

            const [response, thumbnailResponse, viewerResponse] = await Promise.all([

                fetch("projects.json", { cache: "no-store" }),

                fetch("thumbnail-map.json", { cache: "no-store" }),

                fetch("viewer-map.json", { cache: "no-store" })

            ]);

            if(!response.ok){

                throw new Error("projects.json을 불러오지 못했습니다.");

            }

            const projects = await response.json();

            this.projects = Array.isArray(projects) ? projects : [];

            if(thumbnailResponse.ok){

                const thumbnailMap = await thumbnailResponse.json();

                this.thumbnailMap = thumbnailMap && typeof thumbnailMap === "object"

                    ? thumbnailMap

                    : {};

            }

            if(viewerResponse.ok){

                const viewerMap = await viewerResponse.json();

                this.viewerMap = viewerMap && typeof viewerMap === "object"

                    ? viewerMap

                    : {};

            }

        }

        catch(error) {

            console.error(error);

            this.projects = [];
            this.thumbnailMap = {};
            this.viewerMap = {};

        }

        this.createPortfolioPages();

        this.updateCategoryPreviews();

        this.updatePage();

    }

    getProject() {

        const project = this.projects[0] || {};

        return {

            ...project,

            images: Array.isArray(project.images) ? project.images.filter(Boolean) : [],

            imageAlts: project.imageAlts && typeof project.imageAlts === "object"

                ? project.imageAlts

                : {},

            videos: Array.isArray(project.videos)

                ? project.videos.filter(video => video && video.url)

                : []

        };

    }

    getThumbnailUrl(fileName) {

        return this.thumbnailMap[fileName] || `images/${encodeURIComponent(fileName)}`;

    }

    getViewerUrl(fileName) {

        if(this.viewerMap[fileName]){

            return this.viewerMap[fileName];

        }

        if(window.location.port){

            return `/viewer-image/${encodeURIComponent(fileName)}`;

        }

        return `images/${encodeURIComponent(fileName)}`;

    }

    updateCategoryPreviews() {

        const project = this.getProject();
        const firstImage = project.images[0];
        const firstVideo = project.videos[0];

        this.renderCategoryPreview(
            this.visualizationTab,
            firstImage
                ? {
                    type: "image",
                    src: this.getThumbnailUrl(firstImage)
                }
                : null
        );

        this.renderCategoryPreview(
            this.filmTab,
            firstVideo
                ? firstVideo.poster
                    ? {
                        type: "image",
                        src: this.getThumbnailUrl(firstVideo.poster)
                    }
                    : {
                        type: "video",
                        src: firstVideo.url
                    }
                : null
        );

    }

    renderCategoryPreview(tab, previewData) {

        const preview = tab?.querySelector(".media-tab-preview");

        if(!preview){

            return;

        }

        preview.replaceChildren();
        this.categoryVideoPreview = null;
        this.categoryVideoPreviewSrc = "";
        tab.classList.toggle("has-preview", Boolean(previewData));
        tab.onpointerenter = null;
        tab.onpointerleave = null;
        tab.onfocus = null;
        tab.onblur = null;

        if(!previewData){

            return;

        }

        if(previewData.type === "image"){

            const image = document.createElement("img");

            image.src = previewData.src;
            image.alt = "";
            image.decoding = "async";
            image.loading = "eager";

            image.addEventListener("error", () => {

                tab.classList.remove("has-preview");

            });

            preview.appendChild(image);

            return;

        }

        const video = document.createElement("video");

        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "none";
        video.tabIndex = -1;
        video.setAttribute("aria-hidden", "true");

        const startPreview = () => {

            this.prepareCategoryVideoPreview();

            if(!window.matchMedia("(hover: hover) and (pointer: fine)").matches){

                return;

            }

            const playPromise = video.play();

            if(playPromise){

                playPromise.catch(() => {});

            }

        };

        const stopPreview = () => {

            video.pause();

        };

        video.addEventListener("error", () => {

            tab.classList.remove("has-preview");

        });

        video.addEventListener("loadedmetadata", () => {

            if(Number.isFinite(video.duration) && video.duration > 0){

                video.currentTime = Math.min(0.1, video.duration / 2);

            }

        }, { once: true });

        this.categoryVideoPreview = video;
        this.categoryVideoPreviewSrc = previewData.src;

        tab.onpointerenter = startPreview;
        tab.onpointerleave = stopPreview;
        tab.onfocus = startPreview;
        tab.onblur = stopPreview;

        preview.appendChild(video);

    }

    prepareCategoryVideoPreview() {

        const video = this.categoryVideoPreview;

        if(!video || !this.categoryVideoPreviewSrc || video.src){

            return;

        }

        video.preload = "metadata";
        video.src = this.categoryVideoPreviewSrc;
        video.load();

    }

    preloadViewerImage(fileName) {

        if(!fileName || this.preloadedViewerImages.has(fileName)){

            return;

        }

        this.preloadedViewerImages.add(fileName);

        const image = new Image();

        image.decoding = "async";

        image.addEventListener("error", () => {

            this.preloadedViewerImages.delete(fileName);

        }, { once: true });

        image.src = this.getViewerUrl(fileName);

    }

    preloadPageImages(page) {

        const fileNames = [...page?.querySelectorAll(".image-box[data-file-name]") || []]

            .map(box => box.dataset.fileName)

            .filter(Boolean);

        if(fileNames.length === 0){

            return;

        }

        const preload = () => fileNames.forEach(fileName => {

            this.preloadViewerImage(fileName);

        });

        if("requestIdleCallback" in window){

            window.requestIdleCallback(preload, { timeout: 500 });

        }

        else {

            window.setTimeout(preload, 150);

        }

    }

    getImageAlt(fileName) {

        return this.getProject().imageAlts[fileName] ||

            fileName.replace(/\.[^/.]+$/, "");

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

                const box = document.createElement("button");

                box.className = "image-box is-loading";

                box.type = "button";

                box.dataset.fileName = fileName;

                box.setAttribute(

                    "aria-label",

                    `${this.getImageAlt(fileName)} 크게 보기`

                );

                const image = document.createElement("img");

                image.alt = this.getImageAlt(fileName);

                image.loading = pageIndex === 0 ? "eager" : "lazy";

                image.decoding = "async";

                if(imageIndex === 0){

                    image.fetchPriority = "high";

                }

                image.addEventListener("load", () => {

                    box.classList.remove("is-loading", "is-error");

                    box.classList.add("is-loaded");

                });

                image.addEventListener("error", () => {

                    box.classList.remove("is-loading", "is-loaded");

                    box.classList.add("is-error");

                });

                image.src = this.getThumbnailUrl(fileName);

                box.addEventListener("click", () => {

                    if(this.consumeSuppressedCardClick()){

                        return;

                    }

                    this.openImage(imageIndex);

                });

                const overlay = document.createElement("div");

                overlay.className = "image-overlay";

                const viewLabel = document.createElement("span");

                viewLabel.textContent = "VIEW";

                const arrow = document.createElement("span");

                arrow.className = "arrow";

                arrow.textContent = "↗";

                const errorLabel = document.createElement("span");

                errorLabel.className = "image-error-label";

                errorLabel.textContent = "IMAGE UNAVAILABLE";

                overlay.append(viewLabel, arrow);

                box.append(image, errorLabel, overlay);

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

                card.addEventListener("click", () => {

                    if(this.consumeSuppressedCardClick()){

                        return;

                    }

                    this.openVideo(videoIndex);

                });

                const media = document.createElement("span");

                media.className = "film-card-media";

                if(video.poster){

                    const poster = document.createElement("img");

                    poster.src = this.getThumbnailUrl(video.poster);

                    poster.alt = "";

                    poster.loading = "lazy";

                    poster.decoding = "async";

                    poster.addEventListener("error", () => {

                        media.classList.add("media-error");

                    });

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

                    preview.addEventListener("error", () => {

                        media.classList.add("media-error");

                    });

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

    consumeSuppressedCardClick() {

        if(!this.suppressNextCardClick){

            return false;

        }

        this.suppressNextCardClick = false;

        return true;

    }

    handlePageTouchStart(event) {

        if(

            event.touches.length !== 1 ||

            this.viewer.classList.contains("show") ||

            this.videoViewer.classList.contains("show")

        ){

            return;

        }

        const target = event.target instanceof Element ? event.target : null;

        if(target?.closest("input, select, textarea, video, .media-tab")){

            return;

        }

        const touch = event.touches[0];

        this.pageTouchStart = {

            x: touch.clientX,

            y: touch.clientY,

            time: Date.now(),

            startedOnCard: Boolean(target?.closest(".image-box, .film-card"))

        };

    }

    handlePageTouchEnd(event) {

        if(!this.pageTouchStart || event.changedTouches.length === 0){

            this.pageTouchStart = null;

            return;

        }

        const touch = event.changedTouches[0];

        const deltaX = touch.clientX - this.pageTouchStart.x;

        const deltaY = touch.clientY - this.pageTouchStart.y;

        const duration = Date.now() - this.pageTouchStart.time;

        const isHorizontalSwipe =

            duration < 800 &&

            Math.abs(deltaX) >= 55 &&

            Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

        if(isHorizontalSwipe){

            if(this.pageTouchStart.startedOnCard){

                this.suppressNextCardClick = true;

                setTimeout(() => {

                    this.suppressNextCardClick = false;

                }, 450);

            }

            if(deltaX < 0){

                this.nextPage();

            }

            else {

                this.previousPage();

            }

        }

        this.pageTouchStart = null;

    }

    getTouchDistance(firstTouch, secondTouch) {

        return Math.hypot(

            secondTouch.clientX - firstTouch.clientX,

            secondTouch.clientY - firstTouch.clientY

        );

    }

    handleImageMouseDown(event) {

        if(event.button !== 0 || this.imageZoom <= 1){

            return;

        }

        event.preventDefault();

        this.imageMouseDrag = {
            x: event.clientX,
            y: event.clientY,
            translateX: this.imageTranslateX,
            translateY: this.imageTranslateY,
            moved: false
        };

        this.viewerImage.classList.add("is-dragging");

    }

    handleImageMouseMove(event) {

        if(!this.imageMouseDrag){

            return;

        }

        event.preventDefault();

        const deltaX = event.clientX - this.imageMouseDrag.x;
        const deltaY = event.clientY - this.imageMouseDrag.y;

        if(Math.hypot(deltaX, deltaY) >= 4){

            this.imageMouseDrag.moved = true;

        }

        this.imageTranslateX =
            this.imageMouseDrag.translateX + deltaX;

        this.imageTranslateY =
            this.imageMouseDrag.translateY + deltaY;

        this.constrainImagePan();
        this.applyImageTransform(false);

    }

    stopImageMouseDrag() {

        this.imageMouseDrag = null;
        this.viewerImage.classList.remove("is-dragging");

    }

    handleImageTouchStart(event) {

        const target = event.target instanceof Element ? event.target : null;

        if(target?.closest("button")){

            return;

        }

        if(event.touches.length === 2){

            event.preventDefault();

            this.pinchStartDistance = this.getTouchDistance(

                event.touches[0],

                event.touches[1]

            );

            this.pinchStartZoom = this.imageZoom;

            return;

        }

        if(event.touches.length === 1){

            const touch = event.touches[0];

            this.imageTouchStart = {

                x: touch.clientX,

                y: touch.clientY,

                time: Date.now(),

                translateX: this.imageTranslateX,

                translateY: this.imageTranslateY

            };

        }

    }

    handleImageTouchMove(event) {

        if(event.touches.length === 2 && this.pinchStartDistance > 0){

            event.preventDefault();

            const distance = this.getTouchDistance(

                event.touches[0],

                event.touches[1]

            );

            this.imageZoom = Math.min(

                4,

                Math.max(1, this.pinchStartZoom * distance / this.pinchStartDistance)

            );

            if(this.imageZoom === 1){

                this.imageTranslateX = 0;

                this.imageTranslateY = 0;

            }

            this.constrainImagePan();

            this.applyImageTransform(false);

            return;

        }

        if(

            event.touches.length === 1 &&

            this.imageTouchStart &&

            this.imageZoom > 1

        ){

            event.preventDefault();

            const touch = event.touches[0];

            this.imageTranslateX =

                this.imageTouchStart.translateX + touch.clientX - this.imageTouchStart.x;

            this.imageTranslateY =

                this.imageTouchStart.translateY + touch.clientY - this.imageTouchStart.y;

            this.constrainImagePan();

            this.applyImageTransform(false);

        }

    }

    handleImageTouchEnd(event) {

        if(this.pinchStartDistance > 0){

            if(event.touches.length < 2){

                this.pinchStartDistance = 0;

                this.pinchStartZoom = this.imageZoom;

            }

            if(event.touches.length > 0){

                const touch = event.touches[0];

                this.imageTouchStart = {

                    x: touch.clientX,

                    y: touch.clientY,

                    time: Date.now(),

                    translateX: this.imageTranslateX,

                    translateY: this.imageTranslateY

                };

            }

            return;

        }

        if(!this.imageTouchStart || event.changedTouches.length === 0){

            this.imageTouchStart = null;

            return;

        }

        const touch = event.changedTouches[0];

        const deltaX = touch.clientX - this.imageTouchStart.x;

        const deltaY = touch.clientY - this.imageTouchStart.y;

        const duration = Date.now() - this.imageTouchStart.time;

        if(

            this.imageZoom <= 1.01 &&

            duration < 800 &&

            Math.abs(deltaX) >= 50 &&

            Math.abs(deltaX) > Math.abs(deltaY) * 1.2

        ){

            event.preventDefault();

            if(deltaX < 0){

                this.nextImage();

            }

            else {

                this.previousImage();

            }

        }

        this.imageTouchStart = null;

    }

    toggleImageZoom(clientX, clientY) {

        if(this.imageZoom > 1){

            this.resetImageZoom();

            return;

        }

        const imageRect = this.viewerImage.getBoundingClientRect();
        const imageCenterX = imageRect.left + imageRect.width / 2;
        const imageCenterY = imageRect.top + imageRect.height / 2;
        const zoomCenterX = Number.isFinite(clientX)
            ? Math.max(imageRect.left, Math.min(imageRect.right, clientX))
            : imageCenterX;
        const zoomCenterY = Number.isFinite(clientY)
            ? Math.max(imageRect.top, Math.min(imageRect.bottom, clientY))
            : imageCenterY;

        this.imageZoom = 2.5;

        this.imageTranslateX =
            (1 - this.imageZoom) * (zoomCenterX - imageCenterX);

        this.imageTranslateY =
            (1 - this.imageZoom) * (zoomCenterY - imageCenterY);

        this.constrainImagePan();

        this.applyImageTransform(true);

    }

    constrainImagePan() {

        const maximumX = Math.max(

            0,

            this.viewerImage.clientWidth * (this.imageZoom - 1) / 2

        );

        const maximumY = Math.max(

            0,

            this.viewerImage.clientHeight * (this.imageZoom - 1) / 2

        );

        this.imageTranslateX = Math.max(

            -maximumX,

            Math.min(maximumX, this.imageTranslateX)

        );

        this.imageTranslateY = Math.max(

            -maximumY,

            Math.min(maximumY, this.imageTranslateY)

        );

    }

    applyImageTransform(animate = true) {

        this.viewerImage.style.transition = animate

            ? "transform .25s ease"

            : "none";

        this.viewerImage.style.transform =

            `translate3d(${this.imageTranslateX}px, ${this.imageTranslateY}px, 0) scale(${this.imageZoom})`;

        this.viewerImage.classList.toggle("is-zoomed", this.imageZoom > 1);

    }

    resetImageZoom() {

        this.stopImageMouseDrag();

        this.imageZoom = 1;

        this.imageTranslateX = 0;

        this.imageTranslateY = 0;

        this.pinchStartDistance = 0;

        this.applyImageTransform(true);

    }

    handleVideoTouchStart(event) {

        const target = event.target instanceof Element ? event.target : null;

        if(event.touches.length !== 1 || target?.closest("video, button")){

            this.videoTouchStart = null;

            return;

        }

        const touch = event.touches[0];

        this.videoTouchStart = {

            x: touch.clientX,

            y: touch.clientY,

            time: Date.now()

        };

    }

    handleVideoTouchEnd(event) {

        if(!this.videoTouchStart || event.changedTouches.length === 0){

            this.videoTouchStart = null;

            return;

        }

        const touch = event.changedTouches[0];

        const deltaX = touch.clientX - this.videoTouchStart.x;

        const deltaY = touch.clientY - this.videoTouchStart.y;

        const duration = Date.now() - this.videoTouchStart.time;

        if(

            duration < 800 &&

            Math.abs(deltaX) >= 55 &&

            Math.abs(deltaX) > Math.abs(deltaY) * 1.2

        ){

            if(deltaX < 0){

                this.nextVideo();

            }

            else {

                this.previousVideo();

            }

        }

        this.videoTouchStart = null;

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

        const pageTotal = Math.max(this.pages.length, 1);
        const pageCurrent = this.currentPage + 1;

        this.pageProgressBar.style.transform = `scaleX(${pageCurrent / pageTotal})`;
        this.pageProgress.setAttribute("aria-valuenow", String(pageCurrent));
        this.pageProgress.setAttribute("aria-valuemax", String(pageTotal));

        this.prevBtn.disabled = this.currentPage === 0;

        this.nextBtn.disabled = this.currentPage === this.pages.length - 1;

        const activePage = this.pages[this.currentPage];

        if(this.currentPage >= 1){

            this.prepareCategoryVideoPreview();

        }

        this.preloadPageImages(activePage);

        activePage?.querySelectorAll(".image-box, .film-card").forEach((box, index) => {

            box.classList.remove("show");

            setTimeout(() => box.classList.add("show"), index * 120);

        });

    }

    trapDialogFocus(event, dialog) {

        if(event.key !== "Tab"){

            return false;

        }

        const focusable = [...dialog.querySelectorAll(

            "button:not([disabled]), video[controls], [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"

        )].filter(element => !element.hidden && element.offsetParent !== null);

        if(focusable.length === 0){

            event.preventDefault();

            return true;

        }

        const first = focusable[0];

        const last = focusable[focusable.length - 1];

        if(event.shiftKey && document.activeElement === first){

            event.preventDefault();

            last.focus();

        }

        else if(!event.shiftKey && document.activeElement === last){

            event.preventDefault();

            first.focus();

        }

        return true;

    }

    rememberFocus() {

        this.lastFocusedElement = document.activeElement instanceof HTMLElement

            ? document.activeElement

            : null;

    }

    restoreFocus() {

        const target = this.lastFocusedElement;

        this.lastFocusedElement = null;

        if(target?.isConnected){

            target.focus();

        }

    }

    setBackgroundInert(isInert) {

        this.app.inert = isInert;

        this.navigation.inert = isInert;

    }

    handleKeyboard(event) {

        if(this.videoViewer.classList.contains("show")){

            if(this.trapDialogFocus(event, this.videoViewer)){

                return;

            }

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

            if(this.trapDialogFocus(event, this.viewer)){

                return;

            }

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

        this.rememberFocus();

        this.setBackgroundInert(true);

        this.currentVideoIndex = index;

        this.updateViewerVideo(videos, true);

        this.videoViewer.classList.add("show");

        this.videoViewer.setAttribute("aria-hidden", "false");

        window.setTimeout(() => {

            this.closeVideoViewer.focus({ preventScroll: true });

        }, 400);

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

        this.videoViewer.classList.remove("media-error");

        this.videoViewerPlayer.pause();

        this.videoViewerPlayer.src = video.url;

        if(video.poster){

            this.videoViewerPlayer.poster = this.getViewerUrl(video.poster);

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

        this.videoViewer.classList.remove("media-error");

        this.setBackgroundInert(false);

        this.restoreFocus();

    }

    openImage(index) {

        const images = this.getProject().images;

        if(images.length === 0){

            return;

        }

        this.rememberFocus();

        this.setBackgroundInert(true);

        this.currentImageIndex = index;

        this.resetImageZoom();

        this.viewer.classList.remove("media-error");

        this.viewer.classList.add("media-loading");

        this.viewerImage.alt = this.getImageAlt(images[index]);

        this.viewerImage.src = this.getViewerUrl(images[index]);

        this.preloadViewerImage(images[(index + 1) % images.length]);

        this.preloadViewerImage(images[(index - 1 + images.length) % images.length]);

        this.viewerCount.textContent = `${index + 1} / ${images.length}`;

        this.viewerSwipeHint.hidden = images.length <= 1;

        this.viewer.classList.add("show");

        this.viewer.setAttribute("aria-hidden", "false");

        window.setTimeout(() => {

            this.closeViewer.focus({ preventScroll: true });

        }, 400);

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

        this.resetImageZoom();

        this.viewer.classList.remove("media-error");

        this.viewer.classList.add("media-loading");

        this.viewerImage.alt = this.getImageAlt(images[this.currentImageIndex]);

        this.viewerImage.src = this.getViewerUrl(images[this.currentImageIndex]);

        this.preloadViewerImage(

            images[(this.currentImageIndex + 1) % images.length]

        );

        this.preloadViewerImage(

            images[(this.currentImageIndex - 1 + images.length) % images.length]

        );

        this.viewerCount.textContent = `${this.currentImageIndex + 1} / ${images.length}`;

    }

    closeImage() {

        this.viewer.classList.remove("show");

        this.viewer.setAttribute("aria-hidden", "true");

        this.resetImageZoom();

        this.viewerImage.src = "";

        this.viewerImage.alt = "";

        this.viewer.classList.remove("media-error", "media-loading");

        this.setBackgroundInert(false);

        this.restoreFocus();

    }

}

document.addEventListener("DOMContentLoaded", () => {

    new PortfolioApp();

});

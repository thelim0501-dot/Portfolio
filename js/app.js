// ============================================
// Portfolio Builder
// Version 2.0
// ============================================

class PortfolioApp {

    constructor() {

        this.pages = [];
        this.portfolioContainer = document.getElementById("portfolioPages");

        this.prevBtn = document.getElementById("prevBtn");
        this.nextBtn = document.getElementById("nextBtn");
        this.pageNumber = document.getElementById("pageNumber");

        this.gallery = document.getElementById("gallery");

        this.viewer = document.getElementById("viewer");
        this.viewerImage = document.getElementById("viewerImage");
        this.viewerPrev = document.getElementById("viewerPrev");
        this.viewerNext = document.getElementById("viewerNext");
        this.viewerCount = document.getElementById("viewerCount");

        this.currentImageIndex = 0;
        this.closeViewer = document.getElementById("closeViewer");

        this.currentPage = 0;

        this.projects = [];

        this.initialize();

    }

    async initialize() {

    this.bindEvents();

    await this.loadProjects();

// =========================
// Loader Animation
// =========================

// 0.3초 동안 검정 화면 유지
setTimeout(() => {

    document.getElementById("loaderTitle").style.animationPlayState = "running";

}, 300);


// 형광등이 켜진 후 Selected Works 표시
setTimeout(() => {

    document.getElementById("loaderSelected").classList.add("show");

}, 3100);


// Loader 종료
setTimeout(() => {

    document.getElementById("loader").classList.add("hide");

    document.getElementById("app").classList.add("show");

}, 4300);
        
}

    bindEvents() {

        this.prevBtn.addEventListener("click", () => this.previousPage());

        this.nextBtn.addEventListener("click", () => this.nextPage());

        document.addEventListener("keydown", (e) => this.handleKeyboard(e));

        this.closeViewer.addEventListener("click", () => this.closeImage());

        this.viewer.addEventListener("click", () => {

            this.closeImage();

      });

        this.viewerPrev.addEventListener("click", (e) => {

            e.stopPropagation();

            this.previousImage();

      });

        this.viewerNext.addEventListener("click", (e) => {

            e.stopPropagation();

            this.nextImage();

});
        
    }

    async loadProjects() {

        try {

            const response = await fetch("projects.json");

            this.projects = await response.json();

            console.log("Projects Loaded", this.projects);

            this.createPortfolioPages();

this.pages = document.querySelectorAll(".page");

this.updatePage();

        }

        catch (error) {

            console.error(error);

        }

    }

createPortfolioPages(){

    this.portfolioContainer.innerHTML = "";

    const cover =
        document.querySelector(".cover-page");

    const intro =
        document.querySelector(".intro-page");

    this.portfolioContainer.before(cover);
    this.portfolioContainer.before(intro);

    const images = this.projects[0].images;

    const totalPages = Math.ceil(images.length / 4);

    for(let page=0; page<totalPages; page++){

        const section = document.createElement("section");

        section.className = "page portfolio-page";

        section.dataset.page = page + 2;

        const gallery = document.createElement("div");

        gallery.className = "gallery";

        const pageImages =
    images.slice(page * 4, page * 4 + 4);

gallery.classList.add(`count-${pageImages.length}`);

for(let i=0;i<pageImages.length;i++){

    const imageIndex = page * 4 + i;

            if(imageIndex >= images.length) break;

            const box = document.createElement("div");

            box.className = "image-box";

            if(pageImages.length === 1){

    box.style.width = "48%";

}

            box.style.aspectRatio = "16 / 9";

            const img = document.createElement("img");

            img.src = `images/${images[imageIndex]}`;

            img.loading = "lazy";

            img.onclick = ()=>this.openImage(imageIndex);

            box.appendChild(img);

            const overlay = document.createElement("div");

            overlay.className = "image-overlay";

            overlay.innerHTML = `
                <span>VIEW</span>
                <span class="arrow">↗</span>
            `;

            box.appendChild(overlay);

            gallery.appendChild(box);

        }

        section.appendChild(gallery);

        this.portfolioContainer.appendChild(section);

        this.pages = document.querySelectorAll(".page");

    }

}

    nextPage() {

        if (this.currentPage >= this.pages.length - 1) return;

        this.currentPage++;

        this.updatePage();

    }

    previousPage() {

        if (this.currentPage <= 0) return;

        this.currentPage--;

        this.updatePage();

    }

   updatePage() {

    this.pages = document.querySelectorAll(".page");

    this.pages.forEach((page,index)=>{

        page.classList.toggle(
            "active",
            index === this.currentPage
        );

    });

    this.pageNumber.textContent =
        `${String(this.currentPage+1).padStart(2,"0")} / ${String(this.pages.length).padStart(2,"0")}`;

    this.prevBtn.disabled =
        this.currentPage === 0;

    this.nextBtn.disabled =
        this.currentPage === this.pages.length-1;

    const activePage =
        this.pages[this.currentPage];

    if(activePage){

        activePage
            .querySelectorAll(".image-box")
            .forEach((box,index)=>{

                box.classList.remove("show");

                setTimeout(()=>{

                    box.classList.add("show");

                },index*120);

            });

    }

}
    handleKeyboard(e) {

        if (this.viewer.classList.contains("show")) {

    if (e.key === "Escape") {

        this.closeImage();

    }

    if (e.key === "ArrowRight") {

        this.nextImage();

    }

    if (e.key === "ArrowLeft") {

        this.previousImage();

    }

    return;

}

        switch (e.key) {

            case "ArrowRight":
            case "ArrowDown":

                this.nextPage();

                break;

            case "ArrowLeft":
            case "ArrowUp":

                this.previousPage();

                break;

        }

    }

    openImage(index) {

    this.currentImageIndex = index;

    const project = this.projects[0];

    this.viewerImage.src =
    `images/${project.images[index]}`;

    this.viewerCount.textContent =
        `${index + 1} / ${project.images.length}`;

    this.viewer.classList.add("show");

}

    previousImage() {

    const project = this.projects[0];

    this.currentImageIndex--;

    if (this.currentImageIndex < 0) {

        this.currentImageIndex = project.images.length - 1;

    }

    this.viewerImage.src =
    `images/${project.images[this.currentImageIndex]}`;

    this.viewerCount.textContent =
        `${this.currentImageIndex + 1} / ${project.images.length}`;

}

    nextImage() {

    const project = this.projects[0];

    this.currentImageIndex++;

    if (this.currentImageIndex >= project.images.length) {

        this.currentImageIndex = 0;

    }

    this.viewerImage.src =
    `images/${project.images[this.currentImageIndex]}`;

    this.viewerCount.textContent =
        `${this.currentImageIndex + 1} / ${project.images.length}`;

}
    
    closeImage() {

    this.viewer.classList.remove("show");

    this.viewerImage.src = "";

}

}

document.addEventListener("DOMContentLoaded", () => {

    new PortfolioApp();

});

// ======================================================
// Portfolio Editor
// Version 2.0
// ======================================================

const movePagePanel = document.getElementById("movePagePanel");
const movePageInput = document.getElementById("movePageInput");
const confirmMovePage = document.getElementById("confirmMovePage");
const quickMoveBtn = document.getElementById("quickMoveBtn");
const movePageBtn = document.getElementById("movePageBtn");
const moveFirstBtn = document.getElementById("moveFirstBtn");
const renameBtn = document.getElementById("renameBtn");
const uploadPage = document.getElementById("uploadPage");
const uploadPosition = document.getElementById("uploadPosition");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const replaceImageBtn = document.getElementById("replaceImageBtn");
const replaceImageInput = document.getElementById("replaceImageInput");
const replaceImageGroup = document.getElementById("replaceImageGroup");
const deleteBtn = document.getElementById("deleteBtn");
const confirmMove = document.getElementById("confirmMove");
const movePosition = document.getElementById("movePosition");
const moveBtn = document.getElementById("moveBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const movePanel = document.getElementById("movePanel");
const movePage = document.getElementById("movePage");
const pageCanvas = document.getElementById("pageCanvas");
const backupList = document.getElementById("backupList");
const restoreSelectedBackup = document.getElementById("restoreSelectedBackup");
const createBackupBtn = document.getElementById("createBackupBtn");
const refreshSettingsBtn = document.getElementById("refreshSettingsBtn");
const backupStatus = document.getElementById("backupStatus");
const publishBtn = document.getElementById("publishBtn");
const publishStatus = document.getElementById("publishStatus");
const imageModeBtn = document.getElementById("imageModeBtn");
const videoModeBtn = document.getElementById("videoModeBtn");
const settingsModeBtn = document.getElementById("settingsModeBtn");
const videoUploadBtn = document.getElementById("videoUploadBtn");
const videoFileInput = document.getElementById("videoFileInput");
const replaceVideoInput = document.getElementById("replaceVideoInput");
const videoPosterInput = document.getElementById("videoPosterInput");
const videoStatus = document.getElementById("videoStatus");
const videoCanvas = document.getElementById("videoCanvas");
const settingsCanvas = document.getElementById("settingsCanvas");
const propertyPanel = document.getElementById("propertyPanel");
const editorLayout = document.querySelector(".editor-layout");
const settingsImageCount = document.getElementById("settingsImageCount");
const settingsVideoCount = document.getElementById("settingsVideoCount");
const settingsBackupCount = document.getElementById("settingsBackupCount");
const settingsGitState = document.getElementById("settingsGitState");
const settingsR2State = document.getElementById("settingsR2State");
const settingsDataState = document.getElementById("settingsDataState");
const settingsIssueList = document.getElementById("settingsIssueList");
const settingsDeployState = document.getElementById("settingsDeployState");
const settingsDeployTime = document.getElementById("settingsDeployTime");
const settingsPublicSite = document.getElementById("settingsPublicSite");
const imageAltGroup = document.getElementById("imageAltGroup");
const imageAltInput = document.getElementById("imageAltInput");

let images = [];

let imageAlts = {};

let videos = [];

let videoSortable = null;

let posterTargetVideoId = null;

let replaceVideoTargetId = null;

let replaceImageTargetName = null;

let editorMode = "images";

let selectedIndex = -1;

let selectedImages = [];

let lastSelectedIndex = -1;

let pageSortable = null;

let selectedPage = -1;

let dragTargetIndex = -1;

let dragTargetCard = null;

function clearDragTarget(){

    dragTargetCard?.classList.remove("swap-target");

    dragTargetCard = null;

    dragTargetIndex = -1;

}

function setDragTarget(card, index){

    if(dragTargetCard !== card){

        dragTargetCard?.classList.remove("swap-target");

        dragTargetCard = card;

        dragTargetCard.classList.add("swap-target");

    }

    dragTargetIndex = index;

}

function getDragTarget(evt){

    const pointer = evt.originalEvent;

    const elementUnderPointer =
        Number.isFinite(pointer?.clientX) &&
        Number.isFinite(pointer?.clientY)
            ? document.elementFromPoint(pointer.clientX, pointer.clientY)
            : null;

    return (
        elementUnderPointer?.closest(".image[data-index]") ||
        evt.related?.closest(".image[data-index]") ||
        null
    );

}

// ======================================================
// Undo / Redo
// ======================================================

let undoStack = [];

let redoStack = [];

// ======================================================
// Auto Save
// ======================================================

let autoSaveTimer = null;

const AUTO_SAVE_DELAY = 500;

// ======================================================
// Start
// ======================================================

window.addEventListener("DOMContentLoaded", async () => {

    imageModeBtn.addEventListener("click", () => switchEditorMode("images"));

    videoModeBtn.addEventListener("click", () => switchEditorMode("videos"));

    settingsModeBtn.addEventListener("click", () => switchEditorMode("settings"));

    videoUploadBtn.addEventListener("click", () => videoFileInput.click());

    videoFileInput.addEventListener("change", uploadVideos);

    replaceVideoInput.addEventListener("change", replaceVideoFile);

    videoPosterInput.addEventListener("change", uploadVideoPoster);

    publishBtn.addEventListener("click", publishProjects);

    restoreSelectedBackup.addEventListener(

        "click",

        restoreSelected

    );

    createBackupBtn.addEventListener(

        "click",

        createManualBackup

    );

    refreshSettingsBtn.addEventListener("click", loadSettingsStatus);

    confirmMovePage.addEventListener("click", movePageGroup);

    quickMoveBtn.addEventListener("click", quickMove);

    movePageBtn.addEventListener("click", openMovePagePanel);

    moveFirstBtn.addEventListener("click", moveToFirstPage);

    renameBtn.addEventListener("click", renameImage);

    replaceImageBtn.addEventListener("click", selectReplacementImage);

    replaceImageInput.addEventListener("change", replaceSelectedImage);

    imageAltInput.addEventListener("input", () => {

        if(selectedImages.length !== 1 || selectedIndex < 0){

            return;

        }

        const fileName = images[selectedIndex];

        const description = imageAltInput.value.trim();

        if(description){

            imageAlts[fileName] = description;

        }

        else {

            delete imageAlts[fileName];

        }

        autoSave();

    });

    const renameInput = document.getElementById("renameInput");

renameInput.addEventListener("keydown",(e)=>{

    if(e.key === "Enter"){

        renameImage();

    }

});

    moveBtn.addEventListener("click", openMovePanel);

    confirmMove.addEventListener("click", moveImage);

    duplicateBtn.addEventListener("click", duplicateImage);

    deleteBtn.addEventListener("click", async () => {

    if(selectedPage >= 0){

        await deletePage();

    }else{

        await deleteImage();

    }

});

    uploadBtn.addEventListener("click", () => {

    fileInput.click();

});

fileInput.addEventListener("change", uploadImages);

    await loadProjects();

    await loadPublishStatus();

    await loadR2Status();

    await loadSystemStatus();

    await loadBackupList();

    document.addEventListener("keydown", handleKeyboard);

});

window.addEventListener("beforeunload", () => {

    if(autoSaveTimer){

        clearTimeout(autoSaveTimer);

        autoSaveTimer = null;

        saveProjects();

    }

});

// ======================================================
// Load Projects
// ======================================================

async function loadProjects() {

    const response = await fetch("/projects");

    const projects = await response.json();

    if (projects.length > 0) {

        images = projects[0].images.filter(image => image != null);

        videos = Array.isArray(projects[0].videos)

            ? projects[0].videos.filter(video => video && video.url)

            : [];

        imageAlts = projects[0].imageAlts && typeof projects[0].imageAlts === "object"

            ? { ...projects[0].imageAlts }

            : {};

    }

    renderPages();

    renderVideos();

    refreshUploadPageList();

}

// ======================================================
// Render Pages
// ======================================================

function renderPages() {

    pageCanvas.innerHTML = "";

    // 실제 필요한 페이지 수
    let pageCount = Math.ceil(images.length / 4);

    // 최소 1페이지 유지
    pageCount = Math.max(1, pageCount);

    // 존재하지 않는 페이지를 선택 중이면 해제
    if(selectedPage >= pageCount){

        selectedPage = -1;

    }

    // 존재하지 않는 이미지를 선택 중이면 해제
    selectedImages = selectedImages.filter(

        index => index < images.length

    );

    if(selectedImages.length === 0){

        selectedIndex = -1;

    }

    for(let page = 0; page < pageCount; page++){

        pageCanvas.appendChild(createPage(page));

    }

    enablePageSort();

}

// ======================================================
// Create Page
// ======================================================

function createPage(pageIndex) {

    const page = document.createElement("div");

    page.className = "page";

    const start = pageIndex * 4;

    const header = document.createElement("div");

    header.dataset.page = pageIndex;

header.className = "page-header";

const title = document.createElement("div");

title.className = "page-title";

title.textContent =
    `PAGE ${String(pageIndex + 1).padStart(2,"0")}`;

const count = document.createElement("div");

count.className = "page-count";

const imageCount = images
    .slice(start, start + 4)
    .filter(Boolean).length;

const emptyCount = 4 - imageCount;

count.textContent = `${imageCount}/4`;

count.title =

    `${emptyCount} empty slot${emptyCount === 1 ? "" : "s"}`;

    page.dataset.page = pageIndex;

page.dataset.count = imageCount;

if(imageCount === 0){

    page.classList.add("page-empty");

}
else if(imageCount === 4){

    page.classList.add("page-full");

}

header.appendChild(title);

header.appendChild(count);

page.appendChild(header);

header.addEventListener("click",()=>{

    selectedPage = pageIndex;

    selectedImages = [];

    const start = pageIndex * 4;

    for(let i = 0; i < 4; i++){

        if(images[start + i]){

            selectedImages.push(start + i);

        }

    }

    selectedIndex =
        selectedImages.length
        ? selectedImages[selectedImages.length - 1]
        : -1;

    lastSelectedIndex = selectedIndex;

    updateSelectionUI();

    updatePropertyPanel();

});

    const grid = document.createElement("div");

    grid.className = "page-grid";

    page.appendChild(grid);

    for (let i = 0; i < 4; i++) {

        const imageIndex = start + i;

        const imageName = images[imageIndex];

        if (imageName) {

            grid.appendChild(createImageCard(imageName, imageIndex));

        }

        else {

            grid.appendChild(createEmptyCard());

        }

    }

        new Sortable(grid, {

        group: "portfolio",

        onChoose(evt){

            clearDragTarget();

            const originalEvent = evt.originalEvent;

            if(
                originalEvent?.shiftKey ||
                originalEvent?.ctrlKey ||
                originalEvent?.metaKey
            ){

                return;

            }

            const draggedIndex = Number(evt.item.dataset.index);

            if(
                selectedPage >= 0 ||
                !selectedImages.includes(draggedIndex)
            ){

                selectImage(draggedIndex);

            }

        },

        onMove(evt){

            if(selectedImages.length !== 1){

                return;

            }

            const target = getDragTarget(evt);

            const targetIndex = Number(target?.dataset.index);

            if(
                target?.classList.contains("image") &&
                Number.isInteger(targetIndex) &&
                targetIndex !== Number(evt.dragged.dataset.index)
            ){

                setDragTarget(target, targetIndex);

            }

            else{

                clearDragTarget();

            }

            return false;

        },

        onStart(){

    document

        .querySelectorAll(".page")

        .forEach(page=>{

            page.classList.add("drop-target");

        });

},

        animation: 200,

        draggable: ".image",

emptyInsertThreshold: 80,

        swapThreshold: 0.65,

        onEnd: async function (evt) {

            const swapTarget = dragTargetIndex;

            clearDragTarget();

            const fromPage = pageIndex;

            const toPage = [...pageCanvas.children].indexOf(
                evt.to.closest(".page")
            );

            const fromIndex =
                fromPage * 4 + evt.oldIndex;

            let toIndex =
    toPage * 4 + evt.newIndex;

                if(toIndex > images.length){

    toIndex = images.length;

}

            if(swapTarget >= 0){

                await swapImages(fromIndex, swapTarget);

            }
            else if(selectedImages.length !== 1){

                await moveImageTo(fromIndex, toIndex);

            }

            document

    .querySelectorAll(".page")

    .forEach(page=>{

        page.classList.remove("drop-target");

    });

        }

    });

    return page;

}

// ======================================================
// Image Card
// ======================================================

function createImageCard(fileName, index) {

    const card = document.createElement("div");

    card.className = "image";

    card.dataset.index = index;

    card.dataset.file = fileName;

    card.innerHTML = `

        <img src="/images/${fileName}">

    `;

    card.addEventListener("click",(e)=>{

    if(e.shiftKey){

        selectRange(index);

        return;

    }

    if(e.ctrlKey || e.metaKey){

        toggleSelection(index);

        return;

    }

    selectImage(index);

});

    return card;

}

// ======================================================
// Empty Card
// ======================================================

function createEmptyCard() {

    const empty = document.createElement("div");

    empty.dataset.empty = "true";

    empty.className = "image placeholder";

    empty.innerHTML = "EMPTY";

    return empty;

}

// ======================================================
// Select Image
// ======================================================

function selectImage(index){

    selectedPage = -1;

    selectedIndex = index;

    selectedImages = [index];

    lastSelectedIndex = index;

    updateSelectionUI();

    updatePropertyPanel();

}

// ======================================================
// Update Selection UI
// ======================================================

function updateSelectionUI(){

    document

        .querySelectorAll(".image")

        .forEach(card=>{

            const index = Number(card.dataset.index);

            card.classList.toggle(

                "selected",

                selectedImages.includes(index)

            );

        });

}

// ======================================================
// Update Property Panel
// ======================================================

function updatePropertyPanel(){

    const pageMoveGroup = document.getElementById("pageMoveGroup");
    const noSelection = document.getElementById("noSelection");
    const propertyContent = document.getElementById("propertyContent");

    const selectedFile = document.getElementById("selectedFile");

    const renameInput = document.getElementById("renameInput");
    const moveBtn =
    document.getElementById("moveBtn");

const quickMoveBtn =
    document.getElementById("quickMoveBtn");

const moveFirstBtn =
    document.getElementById("moveFirstBtn");

const deleteBtn =
    document.getElementById("deleteBtn");
    const renameBtn = document.getElementById("renameBtn");

    const duplicateBtn = document.getElementById("duplicateBtn");

    imageAltGroup.style.display = "none";

    replaceImageGroup.style.display = "none";

    noSelection.style.display = "none";
    propertyContent.style.display = "block";

    // 항상 보이는 버튼
    moveBtn.parentElement.style.display = "";
    quickMoveBtn.parentElement.style.display = "";
    moveFirstBtn.parentElement.style.display = "";
    deleteBtn.parentElement.style.display = "";

// =====================================
// Nothing Selected
// =====================================

if(selectedPage < 0 && selectedImages.length === 0){

    noSelection.style.display = "block";

    propertyContent.style.display = "none";

    return;

}

noSelection.style.display = "none";

propertyContent.style.display = "block";

// =====================================
// Page Mode
// =====================================

if(selectedPage >= 0){

    selectedFile.textContent =
        `PAGE ${String(selectedPage + 1).padStart(2,"0")}`;

    pageMoveGroup.style.display = "";

    renameInput.parentElement.style.display = "none";

    renameBtn.parentElement.style.display = "none";

    duplicateBtn.parentElement.style.display = "none";

    moveBtn.parentElement.style.display = "none";

    quickMoveBtn.parentElement.style.display = "none";

    moveFirstBtn.parentElement.style.display = "";

    deleteBtn.parentElement.style.display = "";

    return;

}

    pageMoveGroup.style.display = "none";

    if(selectedImages.length === 1){

        selectedFile.textContent = images[selectedIndex];

        renameInput.parentElement.style.display = "";
        renameBtn.parentElement.style.display = "";
        duplicateBtn.parentElement.style.display = "";

        renameInput.value =
            images[selectedIndex].replace(/\.[^/.]+$/, "");

        imageAltGroup.style.display = "";

        replaceImageGroup.style.display = "";

        imageAltInput.value = imageAlts[images[selectedIndex]] || "";

    }
    else{

        selectedFile.textContent =
            `${selectedImages.length} images selected`;

        renameInput.parentElement.style.display = "none";
        renameBtn.parentElement.style.display = "none";
        duplicateBtn.parentElement.style.display = "none";

    }

}

// ======================================================
// Keyboard
// ======================================================

function handleKeyboard(e){

    // Ctrl + Z
if(e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z"){

    e.preventDefault();

    undo();

    return;

}

// Ctrl + Y / Ctrl + Shift + Z
if(
    (e.ctrlKey && e.key.toLowerCase() === "y") ||
    (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z")
){

    e.preventDefault();

    redo();

    return;

}

    // 입력창에서는 단축키 무시
    const tag = document.activeElement.tagName;

    if(tag === "INPUT" || tag === "TEXTAREA"){

        return;

    }

    // Ctrl + A
    if(e.ctrlKey && e.key.toLowerCase() === "a"){

        e.preventDefault();

        selectedImages = [];

        for(let i = 0; i < images.length; i++){

            if(images[i]){

                selectedImages.push(i);

            }

        }

        selectedIndex =

            selectedImages.length

            ? selectedImages[selectedImages.length - 1]

            : -1;

        lastSelectedIndex = selectedIndex;

        updateSelectionUI();

        updatePropertyPanel();

        return;

    }

    // ESC
    if(e.key === "Escape"){

        selectedImages = [];

        selectedIndex = -1;

        lastSelectedIndex = -1;

        updateSelectionUI();

        updatePropertyPanel();

        return;

    }

    // Delete
    if(e.key === "Delete"){

        if(selectedImages.length){

            e.preventDefault();

            deleteImage();

        }

        return;

    }

    // Ctrl + D (준비)
    if(e.ctrlKey && e.key.toLowerCase() === "d"){

        e.preventDefault();

        if(selectedImages.length === 1){

            duplicateImage();

        }

        return;

    }

}

// ======================================================
// Toggle Selection
// ======================================================

function toggleSelection(index){

    const i = selectedImages.indexOf(index);

    if(i === -1){

        selectedImages.push(index);

    }else{

        selectedImages.splice(i,1);

    }

    selectedImages.sort((a,b)=>a-b);

    selectedIndex =

        selectedImages.length

        ? selectedImages[selectedImages.length - 1]

        : -1;

    lastSelectedIndex = selectedIndex;

    updateSelectionUI();

    updatePropertyPanel();

}

// ======================================================
// Select Range
// ======================================================

function selectRange(index){

    if(lastSelectedIndex === -1){

        selectImage(index);

        return;

    }

    const start = Math.min(lastSelectedIndex, index);

    const end = Math.max(lastSelectedIndex, index);

    selectedImages = [];

    for(let i = start; i <= end; i++){

        if(images[i]){

            selectedImages.push(i);

        }

    }

    selectedIndex = index;

    lastSelectedIndex = index;

    updateSelectionUI();

    updatePropertyPanel();

}

// ======================================================
// Move Panel
// ======================================================

function openMovePanel(){

    movePanel.style.display = "block";

    movePage.innerHTML = "";

    const pageCount = Math.ceil(images.length / 4);

    for(let i=0;i<pageCount;i++){

        const option = document.createElement("option");

        option.value = i;

        option.textContent =
            `Page ${String(i+1).padStart(2,"0")}`;

        movePage.appendChild(option);

    }

}

// ======================================================
// Move Image
// ======================================================

async function moveImage(){

    if(selectedImages.length === 0){

    return;

}

    const targetPage = Number(movePage.value);

    const targetPosition = Number(movePosition.value) - 1;

    const newIndex = targetPage * 4 + targetPosition;

    const indexes = [...selectedImages].sort((a,b)=>a-b);

let offset = 0;

for(const index of indexes){

    await moveImageTo(

        index + offset,

        newIndex + offset

    );

    offset++;

}

    movePanel.style.display = "none";

}

// ======================================================
// Move To First Page
// ======================================================

async function moveToFirstPage(){

    // 페이지 선택
    if(selectedPage >= 0){

        await movePageGroupTo(selectedPage, 0);

        selectedPage = 0;

        selectedImages = [];

        const start = 0;

        for(let i = 0; i < 4; i++){

            if(images[start + i]){

                selectedImages.push(start + i);

            }

        }

        selectedIndex =
            selectedImages.length
            ? selectedImages[selectedImages.length - 1]
            : -1;

        updateSelectionUI();

        updatePropertyPanel();

        return;

    }

    // 이미지 선택
    if(selectedIndex >= 0){

        await moveImageTo(selectedIndex, 0);

    }

}

// ======================================================
// Move Page Panel
// ======================================================

function openMovePagePanel(){

    movePagePanel.style.display =

        movePagePanel.style.display === "block"

        ? "none"

        : "block";

    movePageInput.value = selectedPage + 1;

    movePageInput.focus();

    movePageInput.select();

}

// ======================================================
// Move Page
// ======================================================

async function movePageGroup(){

    const targetPage =
        Number(movePageInput.value) - 1;

    const maxPage =
        Math.ceil(images.length / 4) - 1;

    if(
        targetPage < 0 ||
        targetPage > maxPage ||
        targetPage === selectedPage
    ){

        movePagePanel.style.display = "none";
        return;

    }

    await movePageGroupTo(
        selectedPage,
        targetPage
    );

    selectedPage = targetPage;

    selectedImages = [];

    const start = selectedPage * 4;

    for(let i = 0; i < 4; i++){

        if(images[start + i]){

            selectedImages.push(start + i);

        }

    }

    selectedIndex =
        selectedImages.length
        ? selectedImages[selectedImages.length - 1]
        : -1;

    movePagePanel.style.display = "none";

    updateSelectionUI();

    updatePropertyPanel();

}

// ======================================================
// Move Engine
// ======================================================

async function swapImages(fromIndex, toIndex){

    if(
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= images.length ||
        toIndex < 0 ||
        toIndex >= images.length
    ){

        return;

    }

    saveState();

    const swappedImage = images[toIndex];

    images[toIndex] = images[fromIndex];

    images[fromIndex] = swappedImage;

    selectedPage = -1;

    selectedImages = [toIndex];

    selectedIndex = toIndex;

    lastSelectedIndex = toIndex;

    autoSave();

    refreshUploadPageList();

    renderPages();

    requestAnimationFrame(()=>{

        selectImage(toIndex);

    });

}

function pruneImageAlts(){

    const referencedImages = new Set(images.filter(Boolean));

    Object.keys(imageAlts).forEach(fileName => {

        if(!referencedImages.has(fileName)){

            delete imageAlts[fileName];

        }

    });

}

async function moveImageTo(fromIndex, toIndex){

    if(fromIndex === toIndex){

        return;

    }

    saveState();

    if(fromIndex < 0 || fromIndex >= images.length){

        return;

    }

    if(toIndex < 0){

        toIndex = 0;

    }

    if(toIndex > images.length){

        toIndex = images.length;

    }

    const movingImages = [];

const indexes = [...selectedImages]

    .sort((a,b)=>b-a);

for(const index of indexes){

    movingImages.unshift(

        images.splice(index,1)[0]

    );

}

    if(fromIndex < toIndex){

        toIndex--;

    }

    images.splice(

    toIndex,

    0,

    ...movingImages

);

    selectedImages = movingImages.map(

    (_,i)=>toIndex+i

);

selectedIndex =

    selectedImages[selectedImages.length-1];

    autoSave();

refreshUploadPageList();

renderPages();

requestAnimationFrame(()=>{

    document

        .querySelectorAll(".page")

        .forEach(page=>{

            page.classList.remove("drop-target");

        });

});

requestAnimationFrame(()=>{

    const pageIndex = Math.floor(selectedIndex / 4);

const page = document.querySelector(

    `.page[data-page="${pageIndex}"]`

);

page?.scrollIntoView({

    behavior:"smooth",

    block:"nearest"

});

    document
        .querySelectorAll(".image")
        .forEach(card=>{

            const index = Number(card.dataset.index);

            card.classList.toggle(

                "selected",

                selectedImages.includes(index)

            );

        });

    if(selectedIndex >= 0){

        document.getElementById("propertyContent").style.display="block";

        document.getElementById("noSelection").style.display="none";

        document.getElementById("selectedFile").textContent=

            selectedImages.length > 1

            ? `${selectedImages.length} selected`

            : images[selectedIndex];

    }

});

}

// ======================================================
// Duplicate
// ======================================================

async function duplicateImage(){

    if(selectedImages.length === 0){

        return;

    }

    saveState();

    const indexes = [...selectedImages].sort((a,b)=>a-b);

    let offset = 0;

    for(const index of indexes){

        images.splice(

            index + 1 + offset,

            0,

            images[index + offset]

        );

        offset++;

    }

    selectedImages = indexes.map(

        (index,i)=>index + 1 + i

    );

    selectedIndex =

        selectedImages[selectedImages.length-1];

    autoSave();

    refreshUploadPageList();

    renderPages();

    requestAnimationFrame(()=>{

        selectImage(selectedIndex);

    });

}

// ======================================================
// Delete
// ======================================================

async function deleteImage(){

    if(selectedImages.length === 0){

    return;

}

    if(!confirm("이미지를 삭제하시겠습니까?")){

        return;

    }

    saveState();

    selectedImages

    .sort((a,b)=>b-a)

    .forEach(index=>{

        images.splice(index,1);

    });

    selectedImages = [];
    selectedPage = -1;
    selectedIndex = -1;

    pruneImageAlts();

    document.getElementById("propertyContent").style.display = "none";
    document.getElementById("noSelection").style.display = "block";

    autoSave();

    refreshUploadPageList();

    renderPages();

    updatePropertyPanel();

}

// ======================================================
// Delete Page
// ======================================================

async function deletePage(){

    if(selectedPage < 0){

        return;

    }

    if(!confirm("페이지를 삭제하시겠습니까?")){

        return;

    }

    saveState();

    const start = selectedPage * 4;

    images.splice(start, 4);

    images = images.filter(image => image != null);

    pruneImageAlts();

    selectedPage = -1;
    selectedImages = [];
    selectedIndex = -1;
    lastSelectedIndex = -1;

    autoSave();

    refreshUploadPageList();

    renderPages();

    updatePropertyPanel();

}

// ======================================================
// Save State (Undo)
// ======================================================

function saveState(){

    undoStack.push({

        images: [...images],

        imageAlts: { ...imageAlts }

    });

    if(undoStack.length > 100){

        undoStack.shift();

    }

    redoStack = [];

}

// ======================================================
// Auto Save
// ======================================================

function autoSave(){

    clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(async()=>{

        autoSaveTimer = null;

        try {

            await saveProjects();

            console.log("Auto Saved");

        }

        catch(error){

            console.error("Auto save failed:", error);

            setVideoStatus(error.message || "Auto save failed.", "error");

        }

    }, AUTO_SAVE_DELAY);

}

// ======================================================
// Undo
// ======================================================

async function undo(){

    if(undoStack.length === 0){

        return;

    }

    redoStack.push({

        images: [...images],

        imageAlts: { ...imageAlts }

    });

    const previousState = undoStack.pop();

    images = previousState.images;

    imageAlts = previousState.imageAlts;

    selectedImages = [];
    selectedIndex = -1;
    selectedPage = -1;

    await saveProjects();

    refreshUploadPageList();

    renderPages();

    updatePropertyPanel();

}

// ======================================================
// Redo
// ======================================================

async function redo(){

    if(redoStack.length === 0){

        return;

    }

    undoStack.push({

        images: [...images],

        imageAlts: { ...imageAlts }

    });

    const nextState = redoStack.pop();

    images = nextState.images;

    imageAlts = nextState.imageAlts;

    selectedImages = [];
    selectedIndex = -1;
    selectedPage = -1;

    await saveProjects();

    refreshUploadPageList();

    renderPages();

    updatePropertyPanel();

}

// ======================================================
// Save
// ======================================================

async function saveProjects(){

    const response = await fetch("/save",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

        images: images.filter(image => image != null),

        videos,

        imageAlts

        })

    });

    const result = await response.json();

    if(!response.ok || !result.success){

        throw new Error(result.message || "Save failed.");

    }

    return result;

}

// ======================================================
// Video Library
// ======================================================

function setVideoStatus(message, state = ""){

    videoStatus.textContent = message;

    videoStatus.dataset.state = state;

}

function switchEditorMode(mode){

    editorMode = mode;

    const imageMode = mode === "images";

    const videoMode = mode === "videos";

    const settingsMode = mode === "settings";

    imageModeBtn.classList.toggle("active", imageMode);

    imageModeBtn.setAttribute("aria-selected", String(imageMode));

    videoModeBtn.classList.toggle("active", videoMode);

    videoModeBtn.setAttribute("aria-selected", String(videoMode));

    settingsModeBtn.classList.toggle("active", settingsMode);

    settingsModeBtn.setAttribute("aria-selected", String(settingsMode));

    document.querySelectorAll(".image-tool").forEach(element => {

        element.hidden = !imageMode;

    });

    document.querySelectorAll(".video-tool").forEach(element => {

        element.hidden = !videoMode;

    });

    pageCanvas.hidden = !imageMode;

    videoCanvas.hidden = !videoMode;

    settingsCanvas.hidden = !settingsMode;

    propertyPanel.hidden = !imageMode;

    editorLayout.classList.toggle("video-mode", !imageMode);

    if(videoMode){

        renderVideos();

    }

    if(settingsMode){

        loadSettingsStatus();

    }

}

async function loadR2Status(){

    try {

        const response = await fetch("/r2/status");

        const result = await response.json();

        videoUploadBtn.disabled = !result.ready;

        setVideoStatus(result.message, result.ready ? "ready" : "error");

        settingsR2State.textContent = result.ready ? "Connected" : "Not configured";

        settingsR2State.dataset.state = result.ready ? "ready" : "error";

    }

    catch(error){

        videoUploadBtn.disabled = true;

        setVideoStatus("R2 연결 상태를 확인할 수 없습니다.", "error");

        settingsR2State.textContent = "Unavailable";

        settingsR2State.dataset.state = "error";

    }

}

function formatFileSize(bytes){

    if(!Number.isFinite(bytes) || bytes <= 0){

        return "크기 정보 없음";

    }

    const units = ["B", "KB", "MB", "GB"];

    const unitIndex = Math.min(

        Math.floor(Math.log(bytes) / Math.log(1024)),

        units.length - 1

    );

    const value = bytes / (1024 ** unitIndex);

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;

}

function renderVideos(){

    if(videoSortable){

        videoSortable.destroy();

        videoSortable = null;

    }

    videoCanvas.innerHTML = "";

    if(videos.length === 0){

        const empty = document.createElement("div");

        empty.className = "video-empty";

        const title = document.createElement("strong");

        title.textContent = "아직 등록된 영상이 없습니다.";

        const description = document.createElement("span");

        description.textContent = "R2 연결 후 + Add Videos로 MP4 또는 WebM을 업로드하세요.";

        empty.append(title, description);

        videoCanvas.appendChild(empty);

        return;

    }

    videos.forEach((video, index) => {

        const card = document.createElement("article");

        card.className = "video-card";

        card.dataset.id = video.id;

        const preview = document.createElement("div");

        preview.className = "video-card-preview";

        const player = document.createElement("video");

        player.src = video.url;

        if(video.poster){

            player.poster = `../images/${encodeURIComponent(video.poster)}`;

        }

        player.controls = true;

        player.preload = "metadata";

        player.playsInline = true;

        preview.appendChild(player);

        const body = document.createElement("div");

        body.className = "video-card-body";

        const indexLabel = document.createElement("div");

        indexLabel.className = "video-card-index";

        indexLabel.textContent = `FILM ${String(index + 1).padStart(2, "0")} · DRAG TO REORDER`;

        const titleInput = document.createElement("input");

        titleInput.className = "video-title-input";

        titleInput.type = "text";

        titleInput.value = video.title || "";

        titleInput.placeholder = "영상 제목";

        titleInput.addEventListener("input", () => {

            video.title = titleInput.value;

            autoSave();

        });

        const meta = document.createElement("div");

        meta.className = "video-card-meta";

        meta.textContent = `${video.file || "video"} · ${formatFileSize(video.size)}`;

        const posterButton = document.createElement("button");

        posterButton.className = "video-poster-button";

        posterButton.type = "button";

        posterButton.textContent = video.poster ? "Replace Poster" : "+ Add Poster";

        posterButton.addEventListener("click", () => selectVideoPoster(video));

        const replaceButton = document.createElement("button");

        replaceButton.className = "video-replace-button";

        replaceButton.type = "button";

        replaceButton.textContent = "Replace Video";

        replaceButton.addEventListener("click", () => selectReplacementVideo(video));

        const deleteButton = document.createElement("button");

        deleteButton.className = "video-delete-button";

        deleteButton.type = "button";

        deleteButton.textContent = "Delete from R2";

        deleteButton.addEventListener("click", () => deleteVideo(video));

        body.append(

            indexLabel,

            titleInput,

            meta,

            replaceButton,

            posterButton,

            deleteButton

        );

        card.append(preview, body);

        videoCanvas.appendChild(card);

    });

    videoSortable = new Sortable(videoCanvas, {

        animation: 180,

        draggable: ".video-card",

        handle: ".video-card-index",

        onEnd(evt){

            if(evt.oldIndex === evt.newIndex){

                return;

            }

            const [movedVideo] = videos.splice(evt.oldIndex, 1);

            videos.splice(evt.newIndex, 0, movedVideo);

            autoSave();

            renderVideos();

        }

    });

}

function selectVideoPoster(video){

    posterTargetVideoId = video.id;

    videoPosterInput.value = "";

    videoPosterInput.click();

}

function selectReplacementVideo(video){

    replaceVideoTargetId = video.id;

    replaceVideoInput.value = "";

    replaceVideoInput.click();

}

async function replaceVideoFile(){

    const file = replaceVideoInput.files[0];

    const videoIndex = videos.findIndex(video => video.id === replaceVideoTargetId);

    if(!file || videoIndex < 0){

        replaceVideoTargetId = null;

        return;

    }

    setVideoStatus(`Replacing video · ${file.name}`);

    try {

        const formData = new FormData();

        formData.append("video", file);

        const response = await fetch(

            `/video/${encodeURIComponent(replaceVideoTargetId)}/replace`,

            { method: "POST", body: formData }

        );

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "Video replacement failed.");

        }

        videos[videoIndex] = result.video;

        renderVideos();

        setVideoStatus("Video replaced. Order and poster were preserved.", "ready");

    }

    catch(error){

        setVideoStatus(error.message || "Video replacement failed.", "error");

    }

    finally {

        replaceVideoTargetId = null;

        replaceVideoInput.value = "";

    }

}

async function uploadVideoPoster(){

    const file = videoPosterInput.files[0];

    const video = videos.find(item => item.id === posterTargetVideoId);

    if(!file || !video){

        posterTargetVideoId = null;

        return;

    }

    setVideoStatus(`포스터 업로드 중 · ${file.name}`);

    try {

        const formData = new FormData();

        formData.append("poster", file);

        const response = await fetch(

            `/video/${encodeURIComponent(video.id)}/poster`,

            {

                method: "POST",

                body: formData

            }

        );

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "포스터 업로드에 실패했습니다.");

        }

        video.poster = result.poster;

        renderVideos();

        setVideoStatus("영상 포스터가 저장되었습니다.", "ready");

    }

    catch(error){

        setVideoStatus(error.message || "포스터 업로드에 실패했습니다.", "error");

    }

    finally {

        posterTargetVideoId = null;

        videoPosterInput.value = "";

    }

}

async function uploadVideos(){

    const files = [...videoFileInput.files];

    if(files.length === 0){

        return;

    }

    videoUploadBtn.disabled = true;

    try {

        for(let index = 0; index < files.length; index++){

            const file = files[index];

            setVideoStatus(

                `${index + 1}/${files.length} 업로드 중 · ${file.name}`

            );

            const formData = new FormData();

            formData.append("video", file);

            const response = await fetch("/videos/upload", {

                method: "POST",

                body: formData

            });

            const result = await response.json();

            if(!response.ok || !result.success){

                throw new Error(result.message || "영상 업로드에 실패했습니다.");

            }

            videos.push(result.video);

            renderVideos();

        }

        setVideoStatus(`${files.length}개 영상 업로드 완료`, "ready");

    }

    catch(error){

        setVideoStatus(error.message || "영상 업로드에 실패했습니다.", "error");

    }

    finally {

        videoFileInput.value = "";

        videoUploadBtn.disabled = false;

    }

}

async function deleteVideo(video){

    if(!confirm(`R2에서도 '${video.title || video.file}' 영상을 삭제할까요?`)){

        return;

    }

    setVideoStatus("R2에서 영상 삭제 중...");

    try {

        const response = await fetch(`/video/${encodeURIComponent(video.id)}`, {

            method: "DELETE"

        });

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "영상 삭제에 실패했습니다.");

        }

        videos = videos.filter(item => item.id !== video.id);

        renderVideos();

        setVideoStatus("R2에서 영상이 삭제되었습니다.", "ready");

    }

    catch(error){

        setVideoStatus(error.message || "영상 삭제에 실패했습니다.", "error");

    }

}

// ======================================================
// Publish
// ======================================================

function setPublishStatus(message, state = ""){

    publishStatus.textContent = message;

    publishStatus.dataset.state = state;

}

async function loadPublishStatus(){

    setPublishStatus("Git 연결 확인 중...");

    try {

        const response = await fetch("/publish/status");

        const result = await response.json();

        if(result.ready){

            publishBtn.disabled = false;

            settingsGitState.textContent = `Connected · ${result.branch}`;

            settingsGitState.dataset.state = "ready";

            setPublishStatus(

                `Git 연결됨 (${result.branch})`,

                "ready"

            );

            return;

        }

        publishBtn.disabled = true;

        settingsGitState.textContent = "Not connected";

        settingsGitState.dataset.state = "error";

        setPublishStatus(result.message, "error");

    }

    catch(error){

        publishBtn.disabled = true;

        settingsGitState.textContent = "Unavailable";

        settingsGitState.dataset.state = "error";

        setPublishStatus("Git 연결 상태를 확인할 수 없습니다.", "error");

    }

}

async function publishProjects(){

    if(!confirm("현재 변경사항을 Git 원격 저장소에 Publish할까요?")){

        return;

    }

    publishBtn.disabled = true;

    setPublishStatus("저장 후 Publish 중...");

    try {

        clearTimeout(autoSaveTimer);

        autoSaveTimer = null;

        await saveProjects();

        const response = await fetch("/publish", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            }

        });

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message);

        }

        setPublishStatus(result.message, "ready");

        window.setTimeout(loadDeploymentStatus, 1500);

    }

    catch(error){

        setPublishStatus(

            error.message || "Publish에 실패했습니다.",

            "error"

        );

    }

    finally {

        publishBtn.disabled = false;

    }

}

// ======================================================
// Page Sort
// ======================================================

function enablePageSort(){

    if(window.pageSortable){

        pageSortable.destroy();

    }

    pageSortable = new Sortable(pageCanvas,{

    animation:180,

    handle:".page-header",

    onEnd: async function(evt){

        if(evt.oldIndex === evt.newIndex){

            return;

        }

        await movePageGroupTo(

            evt.oldIndex,

            evt.newIndex

        );

    }

});

}

// ======================================================
// Move Page
// ======================================================

async function movePageGroupTo(fromPage, toPage){

    if(fromPage === toPage){

        return;

    }

    saveState();

    // images -> pages
    const pages = [];

    for(let i = 0; i < images.length; i += 4){

        pages.push(images.slice(i, i + 4));

    }

    // 페이지 이동
    const movingPage = pages.splice(fromPage, 1)[0];

    pages.splice(toPage, 0, movingPage);

    // pages -> images
    images = pages.flat();

    autoSave();

    refreshUploadPageList();

    renderPages();

    selectedPage = toPage;

    updatePropertyPanel();

}

// ======================================================
// Quick Move
// ======================================================

async function quickMove(){

    if(selectedImages.length === 0){

        return;

    }

    const page = prompt("Page Number");

    if(page === null){

        return;

    }

    const position = prompt("Position (1~4)");

    if(position === null){

        return;

    }

    const targetIndex =

        (Number(page)-1) * 4 +

        (Number(position)-1);

    const indexes = [...selectedImages]

        .sort((a,b)=>a-b);

    let offset = 0;

    for(const index of indexes){

        await moveImageTo(

            index + offset,

            targetIndex + offset

        );

        offset++;

    }

}

// ======================================================
// Rename
// ======================================================

async function renameImage(){

    if(selectedImages.length !== 1){

        return;

    }

    const input = document.getElementById("renameInput");

    let newName = input.value.trim();

    if(newName === ""){

        alert("파일명을 입력하세요.");

        input.focus();

        return;

    }

    const oldName = images[selectedIndex];

    const ext = oldName.substring(oldName.lastIndexOf("."));

    if(!newName.toLowerCase().endsWith(ext.toLowerCase())){

        newName += ext;

    }

    if(oldName === newName){

        return;

    }

    const response = await fetch("/rename",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

            oldName,

            newName

        })

    });

    const result = await response.json();

    if(!result.success){

        alert(result.message);

        return;

    }

    undoStack = [];

    redoStack = [];

    images = images.map(fileName => fileName === oldName ? newName : fileName);

    videos.forEach(video => {

        if(video.poster === oldName){

            video.poster = newName;

        }

    });

    if(imageAlts[oldName]){

        imageAlts[newName] = imageAlts[oldName];

        delete imageAlts[oldName];

    }

    autoSave();

    renderPages();

    requestAnimationFrame(()=>{

        selectImage(selectedIndex);

    });

}

// ======================================================
// Upload Page List
// ======================================================

function refreshUploadPageList(){

    uploadPage.innerHTML = "";

    const pageCount = Math.max(

        1,

        Math.ceil(images.length / 4)

    );

    for(let i = 0; i < pageCount + 1; i++){

        const option = document.createElement("option");

        option.value = i;

        if(i === pageCount){

    option.textContent =

        `New Page`;

}else{

    option.textContent =

        `Page ${String(i+1).padStart(2,"0")}`;

}

        uploadPage.appendChild(option);

    }

}

// ======================================================
// Upload Images
// ======================================================

function selectReplacementImage(){

    if(selectedImages.length !== 1 || selectedIndex < 0){

        return;

    }

    replaceImageTargetName = images[selectedIndex];

    replaceImageInput.value = "";

    replaceImageInput.click();

}

async function replaceSelectedImage(){

    const file = replaceImageInput.files[0];

    const oldName = replaceImageTargetName;

    if(!file || !oldName){

        replaceImageTargetName = null;

        return;

    }

    replaceImageBtn.disabled = true;

    try {

        const formData = new FormData();

        formData.append("replacement", file);

        const response = await fetch(

            `/image/${encodeURIComponent(oldName)}/replace`,

            { method: "POST", body: formData }

        );

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "Image replacement failed.");

        }

        undoStack = [];

        redoStack = [];

        images = images.map(fileName => {

            return fileName === oldName ? result.file : fileName;

        });

        videos.forEach(video => {

            if(video.poster === oldName){

                video.poster = result.file;

            }

        });

        if(imageAlts[oldName] && oldName !== result.file){

            imageAlts[result.file] = imageAlts[oldName];

            delete imageAlts[oldName];

        }

        renderPages();

        renderVideos();

        requestAnimationFrame(() => selectImage(selectedIndex));

    }

    catch(error){

        alert(error.message || "Image replacement failed.");

    }

    finally {

        replaceImageTargetName = null;

        replaceImageInput.value = "";

        replaceImageBtn.disabled = false;

    }

}

async function uploadImages(){

    if(fileInput.files.length === 0){

        return;

    }

    const formData = new FormData();

    for(const file of fileInput.files){

        formData.append("images", file);

    }

    let result;

    try {

        const response = await fetch("/upload",{

            method:"POST",

            body:formData

        });

        result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "Image upload failed.");

        }

    }

    catch(error){

        alert(error.message || "Image upload failed.");

        fileInput.value = "";

        return;

    }

    saveState();

    let insertIndex;

    const uploadedCount = result.files.length;

    if(uploadPosition.value === "end"){

    insertIndex = images.length;

}else{

    insertIndex =
        (Number(uploadPage.value) * 4) +
        (Number(uploadPosition.value) - 1);

    insertIndex = Math.max(

        0,

        Math.min(

            insertIndex,

            images.length

        )

    );

}

    let currentIndex = insertIndex;

for(const file of result.files){

    images.splice(

        currentIndex,

        0,

        file

    );

    currentIndex++;

}

    selectedIndex = insertIndex + uploadedCount - 1;

    if(selectedIndex >= images.length){

    selectedIndex = images.length - 1;

}

    autoSave();

    refreshUploadPageList();

    renderPages();

    requestAnimationFrame(() => {

        selectImage(selectedIndex);

        refreshUploadPageList();

        document.getElementById("propertyContent").style.display = "block";

        document.getElementById("noSelection").style.display = "none";

        const pageNumber =

    Math.floor(selectedIndex / 4) + 1;

const targetPage = [...document.querySelectorAll(".page")]

    .find(page =>

        page.querySelector(".page-title").textContent ===

        `PAGE ${String(pageNumber).padStart(2,"0")}`

    );

targetPage?.scrollIntoView({

    behavior:"smooth",

    block:"start"

});

    });

    uploadPage.selectedIndex = 0;

    uploadPosition.value = "end";

    fileInput.value = "";

    movePanel.style.display = "none";

}

// ======================================================
// Settings & Backups
// ======================================================

function formatBackupName(file){

    const match = file.match(/^backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:_(\d+))?\.json$/);

    if(!match){

        return file;

    }

    const [, year, month, day, hour, minute, second, suffix] = match;

    const suffixLabel = suffix ? ` · ${Number(suffix) + 1}` : "";

    const backupDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

    const today = new Date();

    if(backupDate.toDateString() === today.toDateString()){

        return `오늘 ${hour}:${minute}:${second}${suffixLabel}`;

    }

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    if(backupDate.toDateString() === yesterday.toDateString()){

        return `어제 ${hour}:${minute}:${second}${suffixLabel}`;

    }

    return `${year}-${month}-${day} ${hour}:${minute}:${second}${suffixLabel}`;

}

async function loadBackupList(){

    try {

        const response = await fetch("/backups");

        const backups = await response.json();

        backupList.innerHTML = "";

        backups.forEach(file => {

            const option = document.createElement("option");

            option.value = file;

            option.textContent = formatBackupName(file);

            backupList.appendChild(option);

        });

        restoreSelectedBackup.disabled = backups.length === 0;

        if(backups.length === 0){

            const option = document.createElement("option");

            option.textContent = "생성된 백업이 없습니다.";

            option.value = "";

            backupList.appendChild(option);

        }

        settingsBackupCount.textContent = backups.length;

    }

    catch(error){

        restoreSelectedBackup.disabled = true;

        backupStatus.textContent = "백업 목록을 불러올 수 없습니다.";

    }

}

async function createManualBackup(){

    createBackupBtn.disabled = true;

    backupStatus.textContent = "현재 상태를 백업하는 중...";

    try {

        clearTimeout(autoSaveTimer);

        autoSaveTimer = null;

        await saveProjects();

        const response = await fetch("/backups/create", { method: "POST" });

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "백업 생성에 실패했습니다.");

        }

        backupStatus.textContent = `백업 완료 · ${formatBackupName(result.file)}`;

        await loadBackupList();

        await loadSystemStatus();

    }

    catch(error){

        backupStatus.textContent = error.message || "백업 생성에 실패했습니다.";

    }

    finally {

        createBackupBtn.disabled = false;

    }

}

async function restoreSelected(){

    if(!backupList.value){

        return;

    }

    if(!confirm("선택한 백업으로 복원할까요? 현재 상태도 복원 직전에 자동 백업됩니다.")){

        return;

    }

    restoreSelectedBackup.disabled = true;

    backupStatus.textContent = "백업을 복원하는 중...";

    try {

        const response = await fetch("/restore-backup", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ file: backupList.value })

        });

        const result = await response.json();

        if(!response.ok || !result.success){

            throw new Error(result.message || "백업 복원에 실패했습니다.");

        }

        await loadProjects();

        await loadBackupList();

        await loadSystemStatus();

        backupStatus.textContent = `복원 완료 · ${formatBackupName(result.restoredFile)}`;

    }

    catch(error){

        backupStatus.textContent = error.message || "백업 복원에 실패했습니다.";

    }

    finally {

        restoreSelectedBackup.disabled = !backupList.value;

    }

}

async function loadSystemStatus(){

    settingsDataState.textContent = "Checking project data...";

    settingsDataState.dataset.state = "loading";

    settingsIssueList.innerHTML = "";

    try {

        const response = await fetch("/system/status");

        const result = await response.json();

        settingsImageCount.textContent = result.counts?.images ?? 0;

        settingsVideoCount.textContent = result.counts?.videos ?? 0;

        settingsBackupCount.textContent = result.counts?.backups ?? 0;

        settingsDataState.textContent = result.healthy

            ? "Project data is valid"

            : "Project data needs attention";

        settingsDataState.dataset.state = result.healthy ? "ready" : "error";

        const issues = [

            ...(result.errors || []),

            ...(result.warnings || [])

        ];

        if(issues.length === 0){

            const item = document.createElement("li");

            item.textContent = "누락되거나 잘못된 이미지·영상 정보가 없습니다.";

            settingsIssueList.appendChild(item);

        }

        else {

            issues.forEach(issue => {

                const item = document.createElement("li");

                item.textContent = issue;

                settingsIssueList.appendChild(item);

            });

        }

    }

    catch(error){

        settingsDataState.textContent = "Unable to inspect project data";

        settingsDataState.dataset.state = "error";

    }

}

async function loadDeploymentStatus(){

    settingsDeployState.textContent = "Checking...";

    settingsDeployState.dataset.state = "loading";

    try {

        const response = await fetch("/deployment/status");

        const result = await response.json();

        if(!response.ok || !result.ready){

            throw new Error(result.message || "Deployment status is unavailable.");

        }

        const successful = result.conclusion === "success";

        const running = result.state === "in_progress" || result.state === "queued";

        settingsDeployState.textContent = running

            ? "Deploying"

            : successful

                ? "Live"

                : result.conclusion || result.state || "Unknown";

        settingsDeployState.dataset.state = successful || running ? "ready" : "error";

        settingsDeployTime.textContent = result.lastSuccessAt

            ? new Date(result.lastSuccessAt).toLocaleString("ko-KR")

            : "No successful deploy yet";

        settingsPublicSite.href = result.publicUrl;

    }

    catch(error){

        settingsDeployState.textContent = "Unavailable";

        settingsDeployState.dataset.state = "error";

        settingsDeployTime.textContent = "--";

        settingsPublicSite.removeAttribute("href");

    }

}

async function loadSettingsStatus(){

    refreshSettingsBtn.disabled = true;

    try {

        await Promise.all([

            loadPublishStatus(),

            loadR2Status(),

            loadSystemStatus(),

            loadDeploymentStatus(),

            loadBackupList()

        ]);

    }

    finally {

        refreshSettingsBtn.disabled = false;

    }

}

// ======================================
// Portfolio CMS
// ======================================

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const imageList = document.getElementById("imageList");
const saveBtn = document.getElementById("saveBtn");
const publishBtn = document.getElementById("publishBtn");
const publishStatus = document.getElementById("publishStatus");

// ======================================
// Start
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    new Sortable(imageList, {

        animation: 180,

        ghostClass: "dragging"

    });

    loadImages();

    loadPublishStatus();

});

// ======================================
// Load Images
// ======================================

async function loadImages() {

    imageList.innerHTML = "";

    const response = await fetch("/projects");

const projects = await response.json();

if (projects.length > 0) {

    projects[0].images.forEach(file => {

        createThumbnail(file);

    });

    }

}

// ======================================
// Upload Click
// ======================================

uploadArea.addEventListener("click", () => {

    fileInput.click();

});

// ======================================
// File Select
// ======================================

fileInput.addEventListener("change", (e) => {

    uploadFiles(e.target.files);

});

// ======================================
// Drag
// ======================================

uploadArea.addEventListener("dragover", (e) => {

    e.preventDefault();

    uploadArea.style.borderColor = "#ffffff";

});

uploadArea.addEventListener("dragleave", () => {

    uploadArea.style.borderColor = "rgba(255,255,255,.15)";

});

uploadArea.addEventListener("drop", (e) => {

    e.preventDefault();

    uploadArea.style.borderColor = "rgba(255,255,255,.15)";

    uploadFiles(e.dataTransfer.files);

});

// ======================================
// Upload
// ======================================

async function uploadFiles(files){

    const formData = new FormData();

    [...files].forEach(file=>{

        if(file.type.startsWith("image")){

            formData.append("images",file);

        }

    });

    const response = await fetch("/upload",{

        method:"POST",

        body:formData

    });

    const result = await response.json();

    console.log(result);

    loadImages();

}

// ======================================
// Thumbnail
// ======================================

function createThumbnail(fileName){

    const card = document.createElement("div");

    card.className = "image-card";

    card.dataset.file = fileName;

    card.innerHTML = `

    <button class="delete-btn">🗑</button>

    <img src="/images/${fileName}">

    <div class="filename">

        ${fileName}

    </div>

`;

card.querySelector(".delete-btn").addEventListener("click", async (e)=>{

    e.stopPropagation();

    if(!confirm("이미지를 삭제하시겠습니까?")){

        return;

    }

    const response = await fetch(

        "/image/" + encodeURIComponent(fileName),

        {

            method:"DELETE"

        }

    );

    const result = await response.json();

    console.log(result);

    loadImages();

});

    imageList.appendChild(card);

}

// ======================================
// SAVE
// ======================================

function getCurrentImages(){

    const images = [];

    document.querySelectorAll(".image-card").forEach(card => {

        images.push(card.dataset.file);

    });

    return images;

}

async function saveCurrentProjects(){

    const response = await fetch("/save",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

            images:getCurrentImages()

        })

    });

    const result = await response.json();

    if(!response.ok || !result.success){

        throw new Error("저장에 실패했습니다.");

    }

}

// ======================================
// Publish
// ======================================

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

            setPublishStatus(

                `Git 연결됨 (${result.branch})`,

                "ready"

            );

            return;

        }

        publishBtn.disabled = true;

        setPublishStatus(result.message, "error");

    }

    catch(error){

        publishBtn.disabled = true;

        setPublishStatus("Git 연결 상태를 확인할 수 없습니다.", "error");

    }

}

publishBtn.addEventListener("click", async () => {

    if(!confirm("현재 변경사항을 Git 원격 저장소에 Publish할까요?")){

        return;

    }

    publishBtn.disabled = true;

    setPublishStatus("저장 후 Publish 중...");

    try {

        await saveCurrentProjects();

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

});

saveBtn.addEventListener("click", async () => {

    const images = [];

    document.querySelectorAll(".image-card").forEach(card => {

        images.push(card.dataset.file);

    });

    const response = await fetch("/save",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

            images

        })

    });

    const result = await response.json();

    console.log(result);

    alert("projects.json 저장 완료");

});

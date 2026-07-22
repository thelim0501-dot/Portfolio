let lastBackupTime = 0;

const BACKUP_INTERVAL = 1000 * 60 * 5;

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { execFile } = require("child_process");
const { promisify } = require("util");

dotenv.config({ path: path.join(__dirname, ".env") });

const execFileAsync = promisify(execFile);

const projectFile = path.join(__dirname, "projects.json");

const backupFolder = path.join(__dirname, "backups");
const tempVideoFolder = path.join(__dirname, "temp-uploads");

const r2Config = {

    accountId: process.env.R2_ACCOUNT_ID,

    accessKeyId: process.env.R2_ACCESS_KEY_ID,

    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,

    bucket: process.env.R2_BUCKET_NAME,

    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "")

};

function getMissingR2Settings(){

    return Object.entries(r2Config)

        .filter(([, value]) => !value)

        .map(([key]) => key);

}

const r2Ready = getMissingR2Settings().length === 0;

const r2Client = r2Ready

    ? new S3Client({

        region: "auto",

        endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,

        credentials: {

            accessKeyId: r2Config.accessKeyId,

            secretAccessKey: r2Config.secretAccessKey

        }

    })

    : null;

function readProjects(){

    if(!fs.existsSync(projectFile)){

        return [];

    }

    return JSON.parse(fs.readFileSync(projectFile, "utf8"));

}

function ensureProject(projects){

    if(projects.length === 0){

        projects.push({ title: "Portfolio", images: [], videos: [], imageAlts: {} });

    }

    projects[0].images = Array.isArray(projects[0].images)

        ? projects[0].images

        : [];

    projects[0].videos = Array.isArray(projects[0].videos)

        ? projects[0].videos

        : [];

    projects[0].imageAlts = projects[0].imageAlts &&

        typeof projects[0].imageAlts === "object" &&

        !Array.isArray(projects[0].imageAlts)

        ? projects[0].imageAlts

        : {};

    return projects[0];

}

function writeProjects(projects){

    const tempFile = `${projectFile}.tmp`;

    fs.writeFileSync(

        tempFile,

        JSON.stringify(projects, null, 4),

        "utf8"

    );

    fs.renameSync(tempFile, projectFile);

}

function validateProjects(projects){

    const errors = [];

    if(!Array.isArray(projects) || projects.length === 0){

        return {

            valid: false,

            errors: ["프로젝트 데이터가 비어 있거나 배열 형식이 아닙니다."]

        };

    }

    const project = projects[0];

    if(!project || typeof project !== "object" || Array.isArray(project)){

        errors.push("첫 번째 프로젝트 데이터가 객체 형식이 아닙니다.");

    }

    if(!Array.isArray(project?.images)){

        errors.push("images가 배열 형식이 아닙니다.");

    }

    else if(project.images.some(image => {

        return typeof image !== "string" ||

            !image.trim() ||

            path.basename(image) !== image;

    })){

        errors.push("images에 잘못된 파일명이 포함되어 있습니다.");

    }

    if(project?.videos != null && !Array.isArray(project.videos)){

        errors.push("videos가 배열 형식이 아닙니다.");

    }

    else if(Array.isArray(project?.videos) && project.videos.some(video => {

        return !video ||

            typeof video.id !== "string" ||

            typeof video.key !== "string" ||

            typeof video.url !== "string" ||

            (

                video.poster != null &&

                (

                    typeof video.poster !== "string" ||

                    !video.poster.trim() ||

                    path.basename(video.poster) !== video.poster

                )

            );

    })){

        errors.push("videos에 잘못된 영상 정보가 포함되어 있습니다.");

    }

    if(

        project?.imageAlts != null &&

        (

            typeof project.imageAlts !== "object" ||

            Array.isArray(project.imageAlts) ||

            Object.entries(project.imageAlts).some(([fileName, description]) => {

                return path.basename(fileName) !== fileName ||

                    typeof description !== "string" ||

                    description.length > 300;

            })

        )

    ){

        errors.push("imageAlts에 잘못된 이미지 설명이 포함되어 있습니다.");

    }

    return {

        valid: errors.length === 0,

        errors

    };

}

function getBackupTimestamp(){

    const now = new Date();

    return now.getFullYear() +

        String(now.getMonth() + 1).padStart(2, "0") +

        String(now.getDate()).padStart(2, "0") + "_" +

        String(now.getHours()).padStart(2, "0") +

        String(now.getMinutes()).padStart(2, "0") +

        String(now.getSeconds()).padStart(2, "0");

}

function getBackupFiles(){

    if(!fs.existsSync(backupFolder)){

        return [];

    }

    return fs.readdirSync(backupFolder)

        .filter(file => {

            return path.basename(file) === file &&

                /^backup_\d{8}_\d{6}(?:_\d+)?\.json$/.test(file);

        })

        .sort()

        .reverse();

}

function trimBackups(){

    const backups = getBackupFiles().reverse();

    while(backups.length > 20){

        fs.unlinkSync(path.join(backupFolder, backups.shift()));

    }

}

function createProjectBackup(){

    if(!fs.existsSync(projectFile)){

        return null;

    }

    const timestamp = getBackupTimestamp();

    let suffix = 0;

    let fileName = `backup_${timestamp}.json`;

    while(fs.existsSync(path.join(backupFolder, fileName))){

        suffix++;

        fileName = `backup_${timestamp}_${suffix}.json`;

    }

    fs.copyFileSync(projectFile, path.join(backupFolder, fileName));

    trimBackups();

    return fileName;

}

function decodeUploadName(name){

    return Buffer.from(name, "latin1").toString("utf8");

}

function getR2PublicUrl(key){

    const encodedKey = key

        .split("/")

        .map(segment => encodeURIComponent(segment))

        .join("/");

    return `${r2Config.publicUrl}/${encodedKey}`;

}

function isSupportedImageUpload(file){

    const originalName = decodeUploadName(file.originalname);

    return ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ||

        /\.(jpg|jpeg|png|webp)$/i.test(originalName);

}

function getAvailableImageName(originalName, ignoredName = ""){

    const safeName = path.basename(originalName).trim();

    const extension = path.extname(safeName).toLowerCase();

    const baseName = path.basename(safeName, path.extname(safeName)) || "image";

    if(!/\.(jpg|jpeg|png|webp)$/i.test(extension)){

        throw new Error("Only JPG, PNG, and WebP images are supported.");

    }

    if(safeName === ignoredName || !fs.existsSync(path.join(uploadFolder, safeName))){

        return safeName;

    }

    return `${baseName}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;

}

async function uploadVideoFileToR2(file){

    const originalName = decodeUploadName(file.originalname);

    const extension = path.extname(originalName).toLowerCase();

    const key = `portfolio/videos/${crypto.randomUUID()}${extension}`;

    const uploader = new Upload({

        client: r2Client,

        params: {

            Bucket: r2Config.bucket,

            Key: key,

            Body: fs.createReadStream(file.path),

            ContentType: file.mimetype,

            ContentLength: file.size,

            CacheControl: "public, max-age=31536000, immutable"

        },

        leavePartsOnError: false

    });

    await uploader.done();

    return {

        key,

        url: getR2PublicUrl(key),

        defaultTitle: path.basename(originalName, extension),

        file: originalName,

        size: file.size,

        type: file.mimetype,

        uploadedAt: new Date().toISOString()

    };

}

async function runGit(args) {

    return execFileAsync(

        "git",

        args,

        {

            cwd: __dirname,

            windowsHide: true

        }

    );

}

async function getCurrentGitBranch() {

    const { stdout } = await runGit([

        "branch",

        "--show-current"

    ]);

    if(stdout.trim()){

        return stdout.trim();

    }

    const { stdout: head } = await runGit([

        "symbolic-ref",

        "--quiet",

        "--short",

        "HEAD"

    ]);

    return head.trim();

}

function getPublishErrorMessage(error) {

    const details = [

        error && error.stderr,

        error && error.message

    ].filter(Boolean).join(" ");

    if(error && error.code === "ENOENT"){

        return "Git이 설치되어 있지 않습니다. Git 설치 후 페이지를 새로고침하세요.";

    }

    if(/not a git repository/i.test(details)){

        return "Git 저장소가 아닙니다. 프로젝트 폴더에서 git init을 먼저 실행하세요.";

    }

    if(/No such remote 'origin'|does not appear to be a git repository/i.test(details)){

        return "origin 원격 저장소가 연결되어 있지 않습니다.";

    }

    if(/Author identity unknown|unable to auto-detect email/i.test(details)){

        return "Git 사용자 이름과 이메일을 먼저 설정하세요.";

    }

    if(/Authentication failed|Permission denied|could not read Username/i.test(details)){

        return "원격 저장소 인증에 실패했습니다. Git 인증 설정을 확인하세요.";

    }

    return "Publish에 실패했습니다. Git 연결 상태를 확인하세요.";

}

function parseGitHubRepository(remote){

    const match = String(remote || "").trim().match(

        /github\.com(?::|\/)([^/]+)\/([^/]+?)(?:\.git)?$/i

    );

    if(!match){

        return null;

    }

    return { owner: match[1], repository: match[2] };

}

if(!fs.existsSync(backupFolder)){

    fs.mkdirSync(backupFolder);

}

if(!fs.existsSync(tempVideoFolder)){

    fs.mkdirSync(tempVideoFolder);

}

const app = express();

app.use(cors());
app.use(express.json());

app.get(["/admin", "/admin/", "/admin/index.html"], (req, res) => {

    res.sendFile(path.join(__dirname, "admin", "editor.html"));

});

app.use(express.static(__dirname));

// =====================================
// Folder
// =====================================

const uploadFolder = path.join(__dirname, "images");

if (!fs.existsSync(uploadFolder)) {

    fs.mkdirSync(uploadFolder);

}

// =====================================
// Multer
// =====================================

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, uploadFolder);

    },

    filename(req, file, cb) {

    try {

        cb(null, getAvailableImageName(decodeUploadName(file.originalname)));

    }

    catch(error){

        cb(error);

    }

}

});

const upload = multer({

    storage,

    limits: {

        fileSize: 250 * 1024 * 1024

    },

    fileFilter(req, file, cb){

        const supported = isSupportedImageUpload(file);

        cb(supported ? null : new Error("Only JPG, PNG, and WebP images are supported."), supported);

    }

});

const replacementImageUpload = multer({

    storage: multer.diskStorage({

        destination(req, file, cb){

            cb(null, tempVideoFolder);

        },

        filename(req, file, cb){

            cb(null, `${Date.now()}-${crypto.randomUUID()}.image-upload`);

        }

    }),

    limits: {

        fileSize: 250 * 1024 * 1024

    },

    fileFilter(req, file, cb){

        const supported = isSupportedImageUpload(file);

        cb(supported ? null : new Error("Only JPG, PNG, and WebP images are supported."), supported);

    }

});

const videoUpload = multer({

    storage: multer.diskStorage({

        destination(req, file, cb){

            cb(null, tempVideoFolder);

        },

        filename(req, file, cb){

            cb(null, `${Date.now()}-${crypto.randomUUID()}.upload`);

        }

    }),

    limits: {

        fileSize: 2 * 1024 * 1024 * 1024

    },

    fileFilter(req, file, cb){

        const originalName = decodeUploadName(file.originalname);

        const supported =

            ["video/mp4", "video/webm"].includes(file.mimetype) ||

            /\.(mp4|webm)$/i.test(originalName);

        cb(supported ? null : new Error("MP4 또는 WebM 영상만 업로드할 수 있습니다."), supported);

    }

});

const posterUpload = multer({

    storage: multer.diskStorage({

        destination(req, file, cb){

            cb(null, uploadFolder);

        },

        filename(req, file, cb){

            const originalName = decodeUploadName(file.originalname);

            const extension = path.extname(originalName).toLowerCase();

            const videoId = String(req.params.id || "video")

                .replace(/[^a-zA-Z0-9-]/g, "");

            cb(null, `film-poster-${videoId}-${Date.now()}${extension}`);

        }

    }),

    limits: {

        fileSize: 30 * 1024 * 1024

    },

    fileFilter(req, file, cb){

        const originalName = decodeUploadName(file.originalname);

        const supported =

            ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ||

            /\.(jpg|jpeg|png|webp)$/i.test(originalName);

        cb(

            supported ? null : new Error("JPG, PNG 또는 WebP 포스터만 업로드할 수 있습니다."),

            supported

        );

    }

});

function removePosterFileIfUnused(fileName, project){

    if(

        typeof fileName !== "string" ||

        !fileName ||

        path.basename(fileName) !== fileName

    ){

        return;

    }

    const usedByGallery = project.images.includes(fileName);

    const usedByVideo = project.videos.some(video => video.poster === fileName);

    if(usedByGallery || usedByVideo){

        return;

    }

    fs.rmSync(path.join(uploadFolder, fileName), { force: true });

}

// ======================================================
// Upload Images
// ======================================================

app.post("/upload", (req, res) => {

    upload.array("images")(req, res, error => {

    if(error){

        return res.status(400).json({ success: false, message: error.message });

    }

    const files = req.files.map(file => file.filename);

    const projectFile = path.join(__dirname, "projects.json");

    let projects = [];

    if(fs.existsSync(projectFile)){

        projects = JSON.parse(

            fs.readFileSync(projectFile, "utf8")

        );

    }

    const project = ensureProject(projects);

    project.images.push(...files);

    writeProjects(projects);

    res.json({

        success: true,

        files

    });

});

});

app.post("/image/:name/replace", (req, res) => {

    replacementImageUpload.single("replacement")(req, res, error => {

        if(error){

            return res.status(400).json({ success: false, message: error.message });

        }

        if(!req.file){

            return res.status(400).json({

                success: false,

                message: "Select an image to use as the replacement."

            });

        }

        const oldName = req.params.name;

        const oldPath = path.join(uploadFolder, oldName);

        const backupPath = path.join(

            tempVideoFolder,

            `${Date.now()}-${crypto.randomUUID()}.image-backup`

        );

        let newName = "";

        let newPath = "";

        try {

            if(path.basename(oldName) !== oldName || !fs.existsSync(oldPath)){

                return res.status(404).json({

                    success: false,

                    message: "The selected image could not be found."

                });

            }

            const projects = readProjects();

            const isReferenced = projects.some(project => {

                return Array.isArray(project?.images) && project.images.includes(oldName);

            });

            if(!isReferenced){

                return res.status(404).json({

                    success: false,

                    message: "The selected image is no longer in the portfolio. Refresh and try again."

                });

            }

            newName = getAvailableImageName(

                decodeUploadName(req.file.originalname),

                oldName

            );

            newPath = path.join(uploadFolder, newName);

            fs.copyFileSync(oldPath, backupPath);

            fs.copyFileSync(req.file.path, newPath);

            projects.forEach(project => {

                project.images = Array.isArray(project.images)

                    ? project.images.map(fileName => fileName === oldName ? newName : fileName)

                    : [];

                project.videos = Array.isArray(project.videos) ? project.videos : [];

                project.videos.forEach(video => {

                    if(video.poster === oldName){

                        video.poster = newName;

                    }

                });

                if(project.imageAlts?.[oldName] && oldName !== newName){

                    project.imageAlts[newName] = project.imageAlts[oldName];

                    delete project.imageAlts[oldName];

                }

            });

            createProjectBackup();

            writeProjects(projects);

            if(oldName !== newName){

                fs.rmSync(oldPath, { force: true });

            }

            res.json({ success: true, file: newName });

        }

        catch(replaceError){

            if(newName === oldName && fs.existsSync(backupPath)){

                fs.copyFileSync(backupPath, oldPath);

            }

            else if(newPath){

                fs.rmSync(newPath, { force: true });

            }

            console.error("Image replacement failed:", replaceError.message);

            res.status(500).json({

                success: false,

                message: "Image replacement failed. The original image was kept."

            });

        }

        finally {

            fs.rmSync(req.file.path, { force: true });

            fs.rmSync(backupPath, { force: true });

        }

    });

});

// ======================================================
// R2 Videos
// ======================================================

app.get("/r2/status", (req, res) => {

    res.json({

        ready: r2Ready,

        message: r2Ready

            ? "R2 연결 준비가 완료되었습니다."

            : ".env에 R2 연결 정보를 입력해 주세요.",

        missing: r2Ready ? [] : getMissingR2Settings()

    });

});

app.post("/videos/upload", (req, res) => {

    if(!r2Ready){

        return res.status(503).json({

            success: false,

            message: ".env에 R2 연결 정보를 먼저 입력해 주세요."

        });

    }

    videoUpload.single("video")(req, res, async error => {

        if(error){

            return res.status(400).json({

                success: false,

                message: error.message

            });

        }

        if(!req.file){

            return res.status(400).json({

                success: false,

                message: "업로드할 영상이 없습니다."

            });

        }

        try {

            const uploadedVideo = await uploadVideoFileToR2(req.file);

            const video = {

                id: crypto.randomUUID(),

                ...uploadedVideo,

                title: uploadedVideo.defaultTitle

            };

            delete video.defaultTitle;

            const projects = readProjects();

            const project = ensureProject(projects);

            project.videos.push(video);

            writeProjects(projects);

            res.json({ success: true, video });

        }

        catch(uploadError){

            console.error("R2 upload failed:", uploadError.message);

            res.status(500).json({

                success: false,

                message: "R2 영상 업로드에 실패했습니다. 연결 정보를 확인해 주세요."

            });

        }

        finally {

            fs.rm(req.file.path, { force: true }, () => {});

        }

    });

});

app.post("/video/:id/replace", (req, res) => {

    if(!r2Ready){

        return res.status(503).json({

            success: false,

            message: "Cloudflare R2 is not configured."

        });

    }

    videoUpload.single("video")(req, res, async error => {

        if(error){

            return res.status(400).json({ success: false, message: error.message });

        }

        if(!req.file){

            return res.status(400).json({

                success: false,

                message: "Select a video to use as the replacement."

            });

        }

        let uploadedVideo = null;

        let replacementCommitted = false;

        try {

            const initialProjects = readProjects();

            const initialProject = ensureProject(initialProjects);

            if(!initialProject.videos.some(video => video.id === req.params.id)){

                return res.status(404).json({

                    success: false,

                    message: "The selected video could not be found."

                });

            }

            uploadedVideo = await uploadVideoFileToR2(req.file);

            const projects = readProjects();

            const project = ensureProject(projects);

            const videoIndex = project.videos.findIndex(video => video.id === req.params.id);

            if(videoIndex < 0){

                throw new Error("The video list changed while the replacement was uploading.");

            }

            const previousVideo = project.videos[videoIndex];

            const replacementVideo = {

                ...previousVideo,

                ...uploadedVideo,

                id: previousVideo.id,

                title: previousVideo.title

            };

            delete replacementVideo.defaultTitle;

            project.videos[videoIndex] = replacementVideo;

            createProjectBackup();

            writeProjects(projects);

            replacementCommitted = true;

            try {

                await r2Client.send(new DeleteObjectCommand({

                    Bucket: r2Config.bucket,

                    Key: previousVideo.key

                }));

            }

            catch(cleanupError){

                console.warn("Previous R2 video cleanup failed:", cleanupError.message);

            }

            res.json({ success: true, video: replacementVideo });

        }

        catch(replaceError){

            if(uploadedVideo && !replacementCommitted){

                try {

                    await r2Client.send(new DeleteObjectCommand({

                        Bucket: r2Config.bucket,

                        Key: uploadedVideo.key

                    }));

                }

                catch(cleanupError){

                    console.warn("Replacement R2 cleanup failed:", cleanupError.message);

                }

            }

            console.error("Video replacement failed:", replaceError.message);

            res.status(500).json({

                success: false,

                message: "Video replacement failed. The original video was kept."

            });

        }

        finally {

            fs.rm(req.file.path, { force: true }, () => {});

        }

    });

});

app.post("/video/:id/poster", (req, res) => {

    posterUpload.single("poster")(req, res, error => {

        if(error){

            return res.status(400).json({

                success: false,

                message: error.message

            });

        }

        if(!req.file){

            return res.status(400).json({

                success: false,

                message: "업로드할 포스터 이미지가 없습니다."

            });

        }

        const projects = readProjects();

        const project = ensureProject(projects);

        const video = project.videos.find(item => item.id === req.params.id);

        if(!video){

            fs.rmSync(req.file.path, { force: true });

            return res.status(404).json({

                success: false,

                message: "영상을 찾을 수 없습니다."

            });

        }

        const previousPoster = video.poster;

        video.poster = req.file.filename;

        writeProjects(projects);

        if(previousPoster && previousPoster !== video.poster){

            removePosterFileIfUnused(previousPoster, project);

        }

        res.json({ success: true, poster: video.poster });

    });

});

app.delete("/video/:id", async (req, res) => {

    if(!r2Ready){

        return res.status(503).json({

            success: false,

            message: ".env에 R2 연결 정보를 먼저 입력해 주세요."

        });

    }

    const projects = readProjects();

    const project = ensureProject(projects);

    const videoIndex = project.videos.findIndex(video => video.id === req.params.id);

    if(videoIndex < 0){

        return res.status(404).json({ success: false, message: "영상을 찾을 수 없습니다." });

    }

    const video = project.videos[videoIndex];

    try {

        await r2Client.send(new DeleteObjectCommand({

            Bucket: r2Config.bucket,

            Key: video.key

        }));

        project.videos.splice(videoIndex, 1);

        removePosterFileIfUnused(video.poster, project);

        writeProjects(projects);

        res.json({ success: true, id: video.id });

    }

    catch(deleteError){

        console.error("R2 delete failed:", deleteError.message);

        res.status(500).json({

            success: false,

            message: "R2 영상 삭제에 실패했습니다."

        });

    }

});

// =====================================
// Image List
// =====================================

app.get("/images", (req, res) => {

    const files = fs.readdirSync(uploadFolder)

        .filter(file => {

            return /\.(jpg|jpeg|png|webp)$/i.test(file);

        })

        .sort();

    res.json(files);

});

// =====================================
// Projects
// =====================================

app.get("/projects", (req, res) => {

    const projectFile = path.join(__dirname, "projects.json");

    if (!fs.existsSync(projectFile)) {

        return res.json([]);

    }

    const data = JSON.parse(

        fs.readFileSync(projectFile, "utf8")

    );

    res.json(data);

});

app.get("/system/status", (req, res) => {

    try {

        const projects = readProjects();

        const validation = validateProjects(projects);

        const project = projects[0] || {};

        const images = Array.isArray(project.images) ? project.images : [];

        const videos = Array.isArray(project.videos) ? project.videos : [];

        const posterImages = videos

            .map(video => video?.poster)

            .filter(Boolean);

        const diskImages = fs.existsSync(uploadFolder)

            ? fs.readdirSync(uploadFolder).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))

            : [];

        const imageCounts = new Map();

        images.forEach(image => {

            imageCounts.set(image, (imageCounts.get(image) || 0) + 1);

        });

        const duplicateImages = [...imageCounts.entries()]

            .filter(([, count]) => count > 1)

            .map(([file, count]) => ({ file, count }));

        const referencedImageFiles = [...images, ...posterImages];

        const missingImages = [...new Set(referencedImageFiles.filter(image => {

            return !fs.existsSync(path.join(uploadFolder, image));

        }))];

        const referencedImages = new Set(referencedImageFiles);

        const unusedImages = diskImages.filter(file => !referencedImages.has(file));

        const errors = [...validation.errors];

        if(missingImages.length > 0){

            errors.push(`참조된 이미지 파일 ${missingImages.length}개가 images 폴더에 없습니다.`);

        }

        const warnings = [];

        if(duplicateImages.length > 0){

            warnings.push(`중복 참조 이미지가 ${duplicateImages.length}종류 있습니다.`);

        }

        if(unusedImages.length > 0){

            warnings.push(`projects.json에서 사용하지 않는 이미지가 ${unusedImages.length}개 있습니다.`);

        }

        const backups = getBackupFiles();

        res.json({

            healthy: errors.length === 0,

            counts: {

                images: images.length,

                videos: videos.length,

                backups: backups.length,

                diskImages: diskImages.length

            },

            errors,

            warnings,

            details: {

                missingImages,

                duplicateImages,

                unusedImages,

                latestBackup: backups[0] || null

            }

        });

    }

    catch(error){

        res.status(500).json({

            healthy: false,

            counts: { images: 0, videos: 0, backups: getBackupFiles().length },

            errors: ["projects.json을 읽거나 검사할 수 없습니다."],

            warnings: [],

            details: { message: error.message }

        });

    }

});

// =====================================
// Save
// =====================================

app.post("/save", (req, res) => {

    const projects = readProjects();

    const project = ensureProject(projects);

    if(Array.isArray(req.body.images)){

        project.images = req.body.images;

    }

    if(Array.isArray(req.body.videos)){

        const incomingVideoIds = new Set(

            req.body.videos.map(video => video?.id).filter(Boolean)

        );

        const missingCurrentVideo = project.videos.find(video => {

            return video?.id && !incomingVideoIds.has(video.id);

        });

        if(missingCurrentVideo){

            return res.status(409).json({

                success: false,

                message: "The video list changed in another admin session. Refresh before saving again."

            });

        }

        project.videos = req.body.videos;

    }

    if(

        req.body.imageAlts &&

        typeof req.body.imageAlts === "object" &&

        !Array.isArray(req.body.imageAlts)

    ){

        project.imageAlts = req.body.imageAlts;

    }

    const validation = validateProjects(projects);

    if(!validation.valid){

        return res.status(400).json({

            success: false,

            message: "저장할 데이터 형식이 올바르지 않습니다.",

            errors: validation.errors

        });

    }

    const currentTime = Date.now();

    if(

        currentTime - lastBackupTime >= BACKUP_INTERVAL &&

        fs.existsSync(projectFile)

    ){

        lastBackupTime = currentTime;

        createProjectBackup();

    }

    writeProjects(projects);

    res.json({

        success:true

    });

});

// =====================================
// Backup List
// =====================================

app.get("/backups", (req, res) => {

    res.json(getBackupFiles());

});

app.post("/backups/create", (req, res) => {

    try {

        const file = createProjectBackup();

        if(!file){

            return res.status(404).json({

                success: false,

                message: "백업할 projects.json 파일이 없습니다."

            });

        }

        res.json({ success: true, file });

    }

    catch(error){

        console.error("Backup creation failed:", error.message);

        res.status(500).json({

            success: false,

            message: "백업 생성에 실패했습니다."

        });

    }

});

// =====================================
// Restore Backup
// =====================================

app.post("/restore-backup", (req, res) => {

    try {

        const backups = getBackupFiles();

        const requestedFile = req.body?.file || backups[0];

        if(!requestedFile ||

            path.basename(requestedFile) !== requestedFile ||

            !backups.includes(requestedFile)){

            return res.status(404).json({

                success: false,

                message: "선택한 백업 파일을 찾을 수 없습니다."

            });

        }

        const backupPath = path.join(backupFolder, requestedFile);

        const backupProjects = JSON.parse(fs.readFileSync(backupPath, "utf8"));

        const validation = validateProjects(backupProjects);

        if(!validation.valid){

            return res.status(400).json({

                success: false,

                message: "백업 데이터 형식이 올바르지 않아 복원하지 않았습니다.",

                errors: validation.errors

            });

        }

        ensureProject(backupProjects);

        const safetyBackup = createProjectBackup();

        writeProjects(backupProjects);

        res.json({

            success: true,

            restoredFile: requestedFile,

            safetyBackup

        });

    }

    catch(error){

        console.error("Backup restore failed:", error.message);

        res.status(500).json({

            success: false,

            message: "백업 복원에 실패했습니다."

        });

    }

});

// =====================================
// Rename Image
// =====================================

app.post("/rename", (req, res) => {

    const { oldName, newName } = req.body;

    if(

        typeof oldName !== "string" ||

        typeof newName !== "string" ||

        path.basename(oldName) !== oldName ||

        path.basename(newName) !== newName ||

        !/\.(jpg|jpeg|png|webp)$/i.test(newName)

    ){

        return res.status(400).json({

            success: false,

            message: "The image file name is invalid."

        });

    }

    const oldPath = path.join(uploadFolder, oldName);

    const newPath = path.join(uploadFolder, newName);

    if(!fs.existsSync(oldPath)){

        return res.json({

            success:false,

            message:"파일이 없습니다."

        });

    }

    if(oldName !== newName && fs.existsSync(newPath)){

        return res.status(409).json({

            success: false,

            message: "An image with that file name already exists."

        });

    }

    const projects = readProjects();

    projects.forEach(project=>{

        project.images = Array.isArray(project.images)

            ? project.images.map(image => image === oldName ? newName : image)

            : [];

        project.videos = Array.isArray(project.videos) ? project.videos : [];

        project.videos.forEach(video => {

            if(video.poster === oldName){

                video.poster = newName;

            }

        });

        if(project.imageAlts?.[oldName]){

            project.imageAlts[newName] = project.imageAlts[oldName];

            delete project.imageAlts[oldName];

        }

    });

    try {

        createProjectBackup();

        if(oldName !== newName){

            fs.renameSync(oldPath, newPath);

        }

        if(projects.length > 0){

            writeProjects(projects);

        }

        res.json({ success: true, file: newName });

    }

    catch(renameError){

        if(

            oldName !== newName &&

            fs.existsSync(newPath) &&

            !fs.existsSync(oldPath)

        ){

            fs.renameSync(newPath, oldPath);

        }

        console.error("Image rename failed:", renameError.message);

        res.status(500).json({

            success: false,

            message: "Image rename failed. The original file was kept."

        });

    }

});

// =====================================
// Delete Image
// =====================================

app.delete("/image/:name", (req, res) => {

    const fileName = decodeURIComponent(req.params.name);

    const filePath = path.join(uploadFolder, fileName);

    if (!fs.existsSync(filePath)) {

        return res.status(404).json({

            success: false,

            message: "파일이 없습니다."

        });

    }

    fs.unlinkSync(filePath);

    const projectFile = path.join(__dirname, "projects.json");

if (fs.existsSync(projectFile)) {

    const projects = JSON.parse(

        fs.readFileSync(projectFile, "utf8")

    );

    if (projects.length > 0) {

        projects[0].images = projects[0].images.filter(

            image => image !== fileName

        );

        if(projects[0].imageAlts){

            delete projects[0].imageAlts[fileName];

        }

        fs.writeFileSync(

            projectFile,

            JSON.stringify(projects, null, 4),

            "utf8"

        );

    }

}
    
    res.json({

        success: true,

        file: fileName

    });

    

});

// =====================================
// Publish
// =====================================

app.get("/publish/status", async (req, res) => {

    try {

        await runGit(["--version"]);

        await runGit([

            "rev-parse",

            "--is-inside-work-tree"

        ]);

        const { stdout: remote } = await runGit([

            "remote",

            "get-url",

            "origin"

        ]);

        const branch = await getCurrentGitBranch();

        if(!branch){

            return res.json({

                ready: false,

                message: "Publish할 Git 브랜치를 찾을 수 없습니다. 첫 커밋을 생성하세요."

            });

        }

        res.json({

            ready: true,

            branch,

            remote: remote.trim()

        });

    }

    catch(error){

        res.json({

            ready: false,

            message: getPublishErrorMessage(error)

        });

    }

});

app.get("/deployment/status", async (req, res) => {

    try {

        const { stdout: remote } = await runGit([

            "remote",

            "get-url",

            "origin"

        ]);

        const repository = parseGitHubRepository(remote);

        if(!repository){

            return res.status(400).json({

                ready: false,

                message: "GitHub repository could not be identified."

            });

        }

        const { owner, repository: repositoryName } = repository;

        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/actions/workflows/deploy-pages.yml/runs?per_page=10`;

        const response = await fetch(apiUrl, {

            headers: {

                "Accept": "application/vnd.github+json",

                "User-Agent": "PortfolioBuilder"

            },

            signal: AbortSignal.timeout(7000)

        });

        if(!response.ok){

            throw new Error(`GitHub API returned ${response.status}.`);

        }

        const data = await response.json();

        const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];

        const latestRun = runs[0] || null;

        const latestSuccess = runs.find(run => run.conclusion === "success") || null;

        const publicUrl = `https://${owner}.github.io/${repositoryName}/`;

        res.json({

            ready: true,

            publicUrl,

            state: latestRun?.status || "unknown",

            conclusion: latestRun?.conclusion || null,

            runUrl: latestRun?.html_url || null,

            updatedAt: latestRun?.updated_at || null,

            lastSuccessAt: latestSuccess?.updated_at || null

        });

    }

    catch(error){

        res.status(503).json({

            ready: false,

            message: error.message || "Deployment status is unavailable."

        });

    }

});

app.post("/publish", async (req, res) => {

    try {

        await runGit([

            "rev-parse",

            "--is-inside-work-tree"

        ]);

        await runGit([

            "remote",

            "get-url",

            "origin"

        ]);

        await runGit([

            "add",

            "--all"

        ]);

        const { stdout: stagedFiles } = await runGit([

            "diff",

            "--cached",

            "--name-only"

        ]);

        let committed = false;

        if(stagedFiles.trim()){

            await runGit([

                "commit",

                "-m",

                "Publish portfolio update"

            ]);

            committed = true;

        }

        const branch = await getCurrentGitBranch();

        if(!branch){

            return res.status(400).json({

                success: false,

                message: "Publish할 Git 브랜치를 찾을 수 없습니다."

            });

        }

        await runGit([

            "push",

            "-u",

            "origin",

            branch

        ]);

        res.json({

            success: true,

            message: committed

                ? "변경사항을 커밋하고 Publish했습니다."

                : "새 변경사항 없이 원격 저장소와 동기화했습니다."

        });

    }

    catch(error){

        console.error("Publish failed:", error.stderr || error.message);

        res.status(500).json({

            success: false,

            message: getPublishErrorMessage(error)

        });

    }

});

// =====================================
// Start
// =====================================

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {

    console.clear();

    console.log("");
    console.log("======================================");
    console.log(" Portfolio CMS");
    console.log("======================================");
    console.log("");
    console.log(` Main  : http://localhost:${PORT}`);
    console.log(` Admin : http://localhost:${PORT}/admin`);
    console.log("");
    console.log("======================================");

});

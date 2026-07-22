const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const outputFolder = path.join(projectRoot, "dist");

if(path.dirname(outputFolder) !== projectRoot || path.basename(outputFolder) !== "dist"){

    throw new Error("공개 빌드 폴더 경로가 안전하지 않습니다.");

}

function copyRequiredFile(relativePath){

    const source = path.join(projectRoot, relativePath);

    const destination = path.join(outputFolder, relativePath);

    if(!fs.existsSync(source)){

        throw new Error(`필수 파일을 찾을 수 없습니다: ${relativePath}`);

    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });

    fs.copyFileSync(source, destination);

}

async function buildPublicPortfolio(){

fs.rmSync(outputFolder, { recursive: true, force: true });

fs.mkdirSync(outputFolder, { recursive: true });

copyRequiredFile("index.html");

copyRequiredFile("projects.json");

copyRequiredFile("favicon.svg");

fs.cpSync(

    path.join(projectRoot, "css"),

    path.join(outputFolder, "css"),

    { recursive: true }

);

fs.cpSync(

    path.join(projectRoot, "js"),

    path.join(outputFolder, "js"),

    { recursive: true }

);

const assetVersion = (process.env.GITHUB_SHA || Date.now().toString()).slice(0, 12);

const publicIndexPath = path.join(outputFolder, "index.html");

const versionedIndex = fs.readFileSync(publicIndexPath, "utf8")

    .replace('href="css/style.css"', `href="css/style.css?v=${assetVersion}"`)

    .replace('src="js/app.js"', `src="js/app.js?v=${assetVersion}"`);

fs.writeFileSync(publicIndexPath, versionedIndex, "utf8");

const projects = JSON.parse(

    fs.readFileSync(path.join(projectRoot, "projects.json"), "utf8")

);

if(!Array.isArray(projects) || !Array.isArray(projects[0]?.images)){

    throw new Error("projects.json의 images 데이터가 올바르지 않습니다.");

}

const publicImages = [...new Set(projects[0].images)];

const publicPosters = [...new Set(

    (Array.isArray(projects[0].videos) ? projects[0].videos : [])

        .map(video => video?.poster)

        .filter(Boolean)

)];

const publicVisuals = [...new Set([...publicImages, ...publicPosters])];

const thumbnailFolder = path.join(outputFolder, "thumbnails");

const thumbnailMap = {};

const viewerFolder = path.join(outputFolder, "viewer-images");

const viewerMap = {};

fs.mkdirSync(thumbnailFolder, { recursive: true });

fs.mkdirSync(viewerFolder, { recursive: true });

for(const fileName of publicVisuals){

    if(typeof fileName !== "string" || path.basename(fileName) !== fileName){

        throw new Error(`안전하지 않은 이미지 파일명입니다: ${fileName}`);

    }

    copyRequiredFile(path.join("images", fileName));

    const sourceImagePath = path.join(projectRoot, "images", fileName);

    const sourceImageBytes = fs.readFileSync(sourceImagePath);

    const contentHash = crypto

        .createHash("sha1")

        .update(fileName)

        .update(sourceImageBytes)

        .digest("hex")

        .slice(0, 16);

    const thumbnailName = `${contentHash}.webp`;

    const viewerName = `${contentHash}.webp`;

    await sharp(sourceImagePath)

        .rotate()

        .resize({ width: 1280, withoutEnlargement: true })

        .webp({ quality: 82, smartSubsample: true })

        .toFile(path.join(thumbnailFolder, thumbnailName));

    thumbnailMap[fileName] = `thumbnails/${thumbnailName}`;

    await sharp(sourceImagePath)

        .rotate()

        .resize({ width: 2560, withoutEnlargement: true })

        .webp({ quality: 88, smartSubsample: true })

        .toFile(path.join(viewerFolder, viewerName));

    viewerMap[fileName] = `viewer-images/${viewerName}`;

}

fs.writeFileSync(

    path.join(outputFolder, "thumbnail-map.json"),

    JSON.stringify(thumbnailMap, null, 2),

    "utf8"

);

fs.writeFileSync(

    path.join(outputFolder, "viewer-map.json"),

    JSON.stringify(viewerMap, null, 2),

    "utf8"

);

fs.writeFileSync(path.join(outputFolder, ".nojekyll"), "", "utf8");

const thumbnailBytes = fs.readdirSync(thumbnailFolder)

    .reduce((total, fileName) => {

        return total + fs.statSync(path.join(thumbnailFolder, fileName)).size;

    }, 0);

const viewerBytes = fs.readdirSync(viewerFolder)

    .reduce((total, fileName) => {

        return total + fs.statSync(path.join(viewerFolder, fileName)).size;

    }, 0);

console.log(

    `Public build complete: ${publicImages.length} images, ${publicPosters.length} posters, ${projects[0].videos?.length || 0} videos, ${(thumbnailBytes / 1024 / 1024).toFixed(1)} MB thumbnails, ${(viewerBytes / 1024 / 1024).toFixed(1)} MB viewer images`

);

}

buildPublicPortfolio().catch(error => {

    console.error(error);

    process.exitCode = 1;

});

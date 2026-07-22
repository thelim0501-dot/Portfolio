const fs = require("fs");
const path = require("path");

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

fs.rmSync(outputFolder, { recursive: true, force: true });

fs.mkdirSync(outputFolder, { recursive: true });

copyRequiredFile("index.html");

copyRequiredFile("projects.json");

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

for(const fileName of [...new Set([...publicImages, ...publicPosters])]){

    if(typeof fileName !== "string" || path.basename(fileName) !== fileName){

        throw new Error(`안전하지 않은 이미지 파일명입니다: ${fileName}`);

    }

    copyRequiredFile(path.join("images", fileName));

}

fs.writeFileSync(path.join(outputFolder, ".nojekyll"), "", "utf8");

console.log(

    `Public build complete: ${publicImages.length} images, ${publicPosters.length} posters, ${projects[0].videos?.length || 0} videos`

);

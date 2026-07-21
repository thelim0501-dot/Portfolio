let lastBackupTime = 0;

const BACKUP_INTERVAL = 1000 * 60 * 5;

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const projectFile = path.join(__dirname, "projects.json");
const backupFile = path.join(__dirname, "projects_backup.json");

const backupFolder = path.join(__dirname, "backups");

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

if(!fs.existsSync(backupFolder)){

    fs.mkdirSync(backupFolder);

}

const app = express();

app.use(cors());
app.use(express.json());
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

    const originalName = Buffer.from(

        file.originalname,

        "latin1"

    ).toString("utf8");

    cb(null, originalName);

}

});

const upload = multer({

    storage

});

// ======================================================
// Upload Images
// ======================================================

app.post("/upload", upload.array("images"), (req, res) => {

    const files = req.files.map(file => file.filename);

    const projectFile = path.join(__dirname, "projects.json");

    let projects = [];

    if(fs.existsSync(projectFile)){

        projects = JSON.parse(

            fs.readFileSync(projectFile, "utf8")

        );

    }

    if(projects.length === 0){

        projects.push({

            title: "Portfolio",

            images: []

        });

    }

    projects[0].images.push(...files);

    fs.writeFileSync(

        projectFile,

        JSON.stringify(projects, null, 4),

        "utf8"

    );

    res.json({

        success: true,

        files

    });

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

// =====================================
// Save
// =====================================

app.post("/save", (req, res) => {

    const images = req.body.images;

    const json = [

        {

            images

        }

    ];

    const currentTime = Date.now();

    if(

        currentTime - lastBackupTime >= BACKUP_INTERVAL &&

        fs.existsSync(projectFile)

    ){

        lastBackupTime = currentTime;

        const backupNow = new Date();

        const timestamp =
            backupNow.getFullYear() +
            String(backupNow.getMonth()+1).padStart(2,"0") +
            String(backupNow.getDate()).padStart(2,"0") + "_" +
            String(backupNow.getHours()).padStart(2,"0") +
            String(backupNow.getMinutes()).padStart(2,"0") +
            String(backupNow.getSeconds()).padStart(2,"0");

        const backupPath = path.join(

            backupFolder,

            `backup_${timestamp}.json`

        );

        fs.copyFileSync(

            projectFile,

            backupPath

        );

        const backups = fs.readdirSync(backupFolder)

            .filter(file => file.endsWith(".json"))

            .sort();

        while(backups.length > 20){

            fs.unlinkSync(

                path.join(

                    backupFolder,

                    backups.shift()

                )

            );

        }

    }

    fs.writeFileSync(

        projectFile,

        JSON.stringify(json, null, 4),

        "utf8"

    );

    res.json({

        success:true

    });

});

// =====================================
// Backup List
// =====================================

app.get("/backups", (req, res) => {

    if(!fs.existsSync(backupFolder)){

        return res.json([]);

    }

    const backups = fs.readdirSync(backupFolder)

        .filter(file => file.endsWith(".json"))

        .sort()

        .reverse();

    res.json(backups);

});

// =====================================
// Restore Selected Backup
// =====================================

app.post("/restore-backup", (req, res) => {

    const { file } = req.body;

    const backupPath = path.join(

        backupFolder,

        file

    );

    if(!fs.existsSync(backupPath)){

        return res.json({

            success:false,

            message:"백업 파일을 찾을 수 없습니다."

        });

    }

    fs.copyFileSync(

        backupPath,

        projectFile

    );

    res.json({

        success:true

    });

});

// =====================================
// Rename Image
// =====================================

app.post("/rename", (req, res) => {

    const { oldName, newName } = req.body;

    const oldPath = path.join(uploadFolder, oldName);

    const newPath = path.join(uploadFolder, newName);

    if(!fs.existsSync(oldPath)){

        return res.json({

            success:false,

            message:"파일이 없습니다."

        });

    }

    fs.renameSync(oldPath, newPath);

    const projectFile = path.join(__dirname,"projects.json");

    if(fs.existsSync(projectFile)){

        const projects = JSON.parse(

            fs.readFileSync(projectFile,"utf8")

        );

        projects.forEach(project=>{

            project.images = project.images.map(image=>

                image===oldName ? newName : image

            );

        });

        fs.writeFileSync(

            projectFile,

            JSON.stringify(projects,null,4),

            "utf8"

        );

    }

    res.json({

        success:true,

        file:newName

    });

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
// Admin
// =====================================

app.get("/admin", (req, res) => {

    res.sendFile(path.join(__dirname, "admin", "index.html"));

});

// =====================================
// Restore Backup
// =====================================

app.post("/restore-backup", (req, res) => {

    if(!fs.existsSync(backupFile)){

        return res.json({

            success:false,

            message:"백업 파일이 없습니다."

        });

    }

    fs.copyFileSync(

        backupFile,

        projectFile

    );

    res.json({

        success:true

    });

});

// =====================================
// Start
// =====================================

const PORT = 3000;

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

const fs = require("fs");
const path = require("path");

const getFFPath = () => {
    for (const iterator of fs.readdirSync(__dirname, {
        withFileTypes: true
    })) {
        if(iterator.isDirectory()) {
            if(path.basename(iterator.name).startsWith("ffmpeg")) {
                return iterator.name;
            }
        }
    }
    throw new Error("no ffmpeg file found");
};

const ffmpeg = getFFPath();

fs.renameSync(ffmpeg, path.join(__dirname, "ffmpeg"));

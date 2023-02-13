const fs = require("fs");
const path = require("path");

const getFFPath = () => {
    for (const iterator of fs.readdirSync(__dirname, {
        withFileTypes: true
    })) {
        if(iterator.isDirectory()) {
            if(path.basename(iterator.name).startsWith("ffmpeg")) {
                return path.join(__dirname ,iterator.name);
            }
        }
    }
    throw new Error("no ffmpeg file found");
};

const ffmpeg = getFFPath();
const dest = path.join(__dirname, "ffmpeg");
fs.renameSync(ffmpeg, dest);
console.log(`${ffmpeg} renamed to ${dest}`)

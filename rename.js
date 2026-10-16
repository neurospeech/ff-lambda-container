import fs from "fs";
import path from "path";

const getFFPath = () => {
    for (const iterator of fs.readdirSync(import.meta.dirname, {
        withFileTypes: true
    })) {
        if(iterator.isDirectory()) {
            if(path.basename(iterator.name).startsWith("ffmpeg")) {
                return path.join(import.meta.dirname ,iterator.name);
            }
        }
    }
    throw new Error("no ffmpeg file found");
};

const ffmpeg = getFFPath();
const dest = path.join(import.meta.dirname, "ffmpeg");
fs.renameSync(ffmpeg, dest);
console.log(`${ffmpeg} renamed to ${dest}`)

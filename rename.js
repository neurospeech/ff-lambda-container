const fs = require("fs");
const path = require("path");

const ffmpeg = path.join(__dirname, "ffmpeg");

const first = fs.readdirSync(ffmpeg);
fs.renameSync(first[0], path.join(ffmpeg, "static"));

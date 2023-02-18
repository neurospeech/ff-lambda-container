const { createWriteStream } = require("fs");
const ytdl = require("ytdl-core");
ytdl("https://www.youtube.com/watch?v=TiQ7aug-GwI", { filter: format => format.container === "mp4" && format.height >= 480 })
.pipe(createWriteStream("./t.mp4"))
    .on("finish", () => console.log("Download success."))
    .on("error", (error) => console.error(error));

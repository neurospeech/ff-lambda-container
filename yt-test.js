const { createWriteStream, writeFileSync } = require("fs");
const ytdl = require("ytdl-core");

const url = "https://www.youtube.com/watch?v=T9KNpg3awgs";

ytdl.getInfo(url).then((r) => writeFileSync("./t.json", JSON.stringify(r), "utf8"));

// ytdl("https://www.youtube.com/watch?v=T9KNpg3awgs", { filter: format => format.container === "mp4" && format.height >= 480 && format.hasAudio })
// .pipe(createWriteStream("./t.mp4"))
//     .on("finish", () => console.log("Download success."))
//     .on("error", (error) => console.error(error));

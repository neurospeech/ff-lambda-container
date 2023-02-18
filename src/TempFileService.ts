import { file } from "tmp-promise";
import fetch from "node-fetch";
import * as tmp from "tmp";
import * as url from "url";
import * as path from "path";
import { createWriteStream, promises as fsp } from "fs";
import ytdl from "ytdl-core";
import { stat } from "fs/promises";

tmp.setGracefulCleanup();

const containers = {
    ".mp4": "mp4",
    ".webm": "webm"
};

const getContainer = (name: string) => {
    for (const key in containers) {
        if (Object.prototype.hasOwnProperty.call(containers, key)) {
            const element = containers[key];
            if (name.endsWith(key)) {
                return element;
            }
        }
    }

    throw new Error("container not supported");
};


export default class TempFileService {

    public static getTempFile(ext: string = ".tmp") {
        return file({ mode: 0o644, prefix: "tmp-" , postfix: ext});
    }

    public static async downloadTo(inputUrl: string, filePath?: string) {

        if (!filePath) {

            const parsedUrl = url.parse(inputUrl);
            const urlFilePath = parsedUrl.path;
            const fileInfo = path.parse(urlFilePath);

            let t = await file({ mode: 0o644, prefix: "tmp-" , postfix: fileInfo.ext});
            filePath = t.path;
        }

        // if it is a youtube url... use youtube-dl to download...
        if (/^https\:\/\/(www.)?youtube.com\/watch\?/i.test(inputUrl)) {
            return await TempFileService.fetchYouTube(inputUrl, filePath);
        }

        console.log(`Downloading ${inputUrl} to ${filePath}`);

        return await TempFileService.fetch(inputUrl, filePath);
    }

    private static async fetchYouTube(inputUrl: string, filePath) {

        console.log(`Downloading ${inputUrl} to ${filePath}`);

        const container = getContainer(filePath);

        await new Promise<void>((resolve, reject) => {
            ytdl(inputUrl, { filter: format => format.container === container && format.height >= 480 })
                .pipe(createWriteStream(filePath))
                    .on("finish", () => resolve())
                    .on("error", (error) => reject(error));
        });

        const s = await stat(filePath);
        if (!s.size) {
            console.error("File download failed...");
            throw new Error(`Download failed for ${inputUrl}`)
        }

        console.log(`File ${inputUrl} downloaded to ${filePath}, size is ${s.size}`);

        return filePath;
        // return Command.exec(youtubePath, `-f "mp4[height<=720]" -o ${filePath} ${inputUrl}`.split(" "), logDefault, logDefault);
    }


    private static async fetch(inputUrl: string, filePath: string) {
        const rs = await fetch(inputUrl);
        if (rs.status >= 400) {
            // error...
            throw new Error(`${rs.statusText}\r\n${await rs.text()}`);
        }

        await fsp.writeFile(filePath, rs.body);

        console.log(`File ${inputUrl} downloaded to ${filePath}`);

        return filePath;
    }
}

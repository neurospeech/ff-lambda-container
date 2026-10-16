import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { BlockBlobClient } from "@azure/storage-blob";
import { copyFileSync, existsSync, promises } from "fs";
import TempFileService from "../TempFileService.js";
import * as mime from "mime-types";
import FFProbe from "../commands/probe.js";
import Command from "../Command.js";
import uploadS3 from "../commands/uploadS3.js";

let img = path.join(import.meta.dirname, "..", "..", "images", "logo.jpg");

export interface IFFMpegThumbnail {
    time: number;
    url: string;
}

export interface IFFMpegOutput {
    notify: string;
    ignoreMobileReady?: boolean;
    url: string;
    thumbnails?: IFFMpegThumbnail[];
    parameters?: string;
}

export interface IFFMpegParams {
    input: string;
    output: IFFMpegOutput;
}

export default class FFMpeg {

    public static async fastConvert(
        input: string,
        {
            url,
            thumbnails,
        }: IFFMpegOutput) {

        console.log(`Running fast convert for ${input}`);

        var file = await TempFileService.downloadTo(input);

        const fileInfo = path.parse(url.split("?")[0]);
        const outputFile = await TempFileService.getTempFile(fileInfo.ext);


        const { isMobileReady, needsFastStart, hasAudio, hasVideo } = await FFProbe.probe(input, file);
        if (isMobileReady) {
            console.log("Copying file to output");
            copyFileSync(file, outputFile.path);
        } else if (needsFastStart) {
            console.log("Improving FastStart");
            const output = await Command.run(`-i ${file} -c copy -movflags +faststart -y ${outputFile.path}`.split(" "));
            console.log(output);
        } else {

            if (hasVideo) {
                console.log("Video is not mobile ready...");
                return { isMobileReady: false, hasAudio, hasVideo };
            }

            console.log("Converting to mp4 audio only .... no image ... ");
            if (!existsSync(img)) {
                console.log(`${img} does not exist !! something is wrong...`)
            }

            // if(file.endsWith(".m4a")) {
            //     // const output = await FFConfig.run(`-i ${file} -c copy -movflags +faststart ${outputFile.path}`.split(" "));
            //     // console.log(output);
            //     copyFileSync(file, outputFile.path);
            // } else {

            //     return { isMobileReady: false, hasAudio, hasVideo };

            //     // // const output = await FFConfig.run(`-loop 1 -i ${img} -i ${file} -c:a aac -b:a 192k -c:v libx264 -pix_fmt yuv420p -tune stillimage -movflags +faststart -shortest ${outputFile.path}`.split(" "));
            //     // const output = await FFConfig.run(`-i ${file} -c:a aac -b:a 192k -movflags +faststart ${outputFile.path}`.split(" "));
            //     // console.log(output);
            // }
            const output = await Command.run(`-loop 1 -i ${img} -i ${file} -threads 4 -c:a aac -b:a 192k -c:v libx264 -pix_fmt yuv420p -tune stillimage -movflags +faststart -shortest -y ${outputFile.path}`.split(" "));
            // const output = await FFConfig.run(`-i ${file} -c:a aac -b:a 192k -movflags +faststart ${outputFile.path}`.split(" "));
            console.log(output);

        }

        const convert = FFMpeg.uploadFile(url, outputFile.path, true);

        if (hasVideo) {
            await Promise.all([this.thumbnails(input, thumbnails, file), convert]);
        } else {
            await Promise.all([convert, ... thumbnails.map((x) => FFMpeg.uploadFile(x.url, img))])
        }

        const result = {
            isMobileReady: true,
            url,
            thumbnails
        };

        // if(notify) {
        //     console.log(`Notifying ${notify}`);
        //     await fetch(notify, {
        //         method: "POST",
        //         headers: {
        //             "content-type": "application/json"
        //         },
        //         body: "{}"
        //     });
        // }

        return result;
    }

    public static async thumbnails(input: string, times: IFFMpegThumbnail[], file: string = void 0) {

        const start = Date.now();

        console.log("Starting thumbnails");

        file ??= await TempFileService.downloadTo(input);
        const folder = path.dirname(file);
        const fileNames = await new Promise<string[]>((resolve, reject) => {
            let files;
            ffmpeg(file, { timeout: 60 })
                .on("filenames", (names: string[]) => {
                    files = names;
                })
                .on("end", () => {
                    resolve(files);
                })
                .on("error", (error) => {
                    console.error(error);
                    reject(error);
                })
                .screenshots({
                    folder,
                    timestamps: times.map((x) => {
                        if (!x.url) {
                            throw new Error("Url must be specified for timed thumbnail")
                        }
                        return x.time;
                    }),
                    filename: start + "%000i.jpg"
                });
        });


        let lastFile: string;

        await Promise.all(fileNames.map(async (x, i) => {
            const t = times[i];
            if (!t) {
                return;
            }
            let filePath = folder + "/" + x;

            // this will ensure that 1.jpg will exist if 0.jpg exists...
            if(!existsSync(filePath) && i === 1) {
                filePath = lastFile;
            }

            lastFile = filePath;

            await FFMpeg.uploadFile(t.url, filePath);

            return [t, filePath];
        }));



        return times;

    }


    private static async uploadFile(url: string, filePath: string, throwIfNotFound = false) {

        if (!existsSync(filePath)) {
            if (throwIfNotFound) {
                throw new Error(`Failed to upload ${url}, file not found at ${filePath}`)
            }
            console.error(`File does not exist at ${filePath} for ${url}`);
            return;
        }
    
        console.log(`Uploading ${url}`);

        const blobContentType = mime.lookup(filePath);

        if(url.includes("blob.core.windows.net")) {
                

            var b = new BlockBlobClient(url);
            await b.uploadFile(filePath, {
                blobHTTPHeaders: {
                    blobContentType,
                    blobCacheControl: "public, max-age=3240000"
                }
            });
        } else {
            await uploadS3(url, filePath);
        }
        try {
            await promises.unlink(filePath);
        } catch {
            // do nothing...
        }
    }
}

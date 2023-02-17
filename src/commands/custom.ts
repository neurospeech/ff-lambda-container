import ffmpeg from "fluent-ffmpeg";
import path from "path";
import Command, { asJson } from "../Command";
import TempFileService from "../TempFileService";
import fetch, { Request } from "node-fetch";
import * as mime from "mime-types";
import { existsSync, readFileSync, promises } from "fs";
import { BlockBlobClient } from "@azure/storage-blob";

interface ICommandInput {
    name: string;
    filePath?: string;
    url?: string;
}

const thumbnail = "thumbnail";
const thumbnailLength = thumbnail.length;


export default class Custom extends Command {

    public async process(input: any): Promise<any> {

        console.log(`Processing ${JSON.stringify(input)}`);

        const inputs: ICommandInput[] = [];

        let output: ICommandInput;

        let thumbnailTimes: ICommandInput[] = [];

        let command = input.command as string;

        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                const element = input[key];
                if (key === "thumbnailTimes") {
                    thumbnailTimes = element;
                    continue;
                }
                const filePath = (await TempFileService.getTempFile(path.extname(key))).path;
                if(key.startsWith("output")) {
                    output = {
                        name: key,
                        url: element,
                        filePath
                    };
                    // overwrite file...
                    command = command.replace(key, `-y ${filePath}`);
                    continue;
                }
                if (key.startsWith("input")) {
                    inputs.push({
                        name: key,
                        url: element,
                        filePath,
                    });
                    command = command.replace(key, filePath);
                    continue;
                }
            }
        }

        await Promise.all(inputs.map((x) => TempFileService.downloadTo(x.url, x.filePath)));

        // we will upload all back to output urls...
        let rs = "";

        const logDefault = (data: Buffer) => {
            const dt = data.toString("utf8");
            rs += dt + "\n";
            console.log(dt);
            return true;
        };
        
        await Command.run(command.split(" "), logDefault, logDefault);

        const tasks = [this.upload(output)];

        if (thumbnailTimes.length) {
            await this.thumbnails(output.filePath, thumbnailTimes, tasks);
        }

        // upload all outputs...
        await Promise.all(tasks);

        // if it has trigger...
        const trigger = input.trigger;
        if (trigger) {
            const r = await this.trigger(trigger);
            console.log(r);
            rs += r;
        }
        return asJson(rs);
    }

    async trigger(trigger) {
        let url = trigger;
        if (typeof url === "string" && url.startsWith("{")) {
            url = JSON.parse(url);
        }
        if (typeof url !== "string") {
            const r = new Request(trigger.url, {
                method: trigger.method ?? "POST",
                headers: trigger.headers ?? {},
                body: trigger.body ?? ""
            });
            url = r;
        }
        // trigger should be GET
        try {
            const rs = await fetch(url);
            if(rs.status <= 300) {
                return `Trigger invoked ${url} successfully.`;
            }
            throw new Error(`Failed ${await rs.text()}`);
        } catch (e) {
            console.error(e);
            return `Trigger invoke ${url} failed ${e.stack ? e.stack : e}.`;
        }
    }

    async thumbnails(input: string, times: ICommandInput[], tasks: Promise<void>[]) {

        const start = Date.now();

        console.log("Starting thumbnails");

        const folder = path.dirname(input);
        const fileNames = await new Promise<string[]>((resolve, reject) => {
            let files;
            ffmpeg(input, { timeout: 60 })
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
                        return typeof x.name === "number" ? x.name : parseFloat(x.name);
                    }),
                    filename: start + "%000i.jpg"
                });
        });


        let lastFile: string;

        fileNames.forEach((x, i) => {
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

            tasks.push(this.upload({
                name: t.name,
                url: t.url,
            filePath }));
        });


        return times;

    }
    
    async upload(x: ICommandInput) {
        if (!existsSync(x.filePath)) {
            console.log(`File ${x.filePath} does not exist.`);
            return;
        }
        if (!x.url) {
            console.log(`Cannot upload ${x.filePath} as upload url is empty.`);
            return;
        }
        if (x.url.includes(".blob.core.windows.net")) {
            // use put...
            return this.uploadAzure(x);
        }
        console.log(`File ${x.url} not supported for upload.`);
    }

    async uploadAzure({url, filePath}: ICommandInput) {
        console.log(`Uploading ${url}`);

        const blobContentType = mime.lookup(filePath);

        var b = new BlockBlobClient(url);
        await b.uploadFile(filePath, {
            blobHTTPHeaders: {
                blobContentType,
                blobCacheControl: "public, max-age=3240000"
            }
        });
        try {
            await promises.unlink(filePath);
        } catch {
            // do nothing...
        }

    }

}

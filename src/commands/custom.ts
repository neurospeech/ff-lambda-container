import ffmpeg from "fluent-ffmpeg";
import path from "path";
import Command from "../Command";
import TempFileService from "../TempFileService";
import fetch, { Request } from "node-fetch";
import * as mime from "mime-types";
import { existsSync, readFileSync, promises } from "fs";
import { BlockBlobClient } from "@azure/storage-blob";
import ProgressParser from "./ProgressParser";

type ITriggerObject = { url: string, method: string, body: any, headers: any};

type ITrigger = string | ITriggerObject;

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

        const progress = input.progress as ITriggerObject;

        for (const key in input) {
            if (key === "inputs") {
                continue;
            }
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

        if (input.inputs) {
            for (const key in input.inputs) {
                const filePath = (await TempFileService.getTempFile(path.extname(key))).path;
                if (Object.prototype.hasOwnProperty.call(input.inputs, key)) {
                    const element = input.inputs[key];
                    inputs.push({
                        name: key,
                        url: element,
                        filePath,
                    });
                    command = command.replace(key, filePath);            
                }
            }
        }

        if (progress) {
            this.log(progress, "Downloading files",0.01);
        }

        await Promise.all(inputs.map((x) => TempFileService.downloadTo(x.url, x.filePath)));

        // we will upload all back to output urls...
        let rs = "";

        let duration = 0;

        const logDefault = (data: Buffer) => {
            const dt = data.toString("utf8");

            if (progress) {
                const [d,t] = ProgressParser.parse(dt);
                if (d) {
                    duration = duration < d ? d : duration;
                }

                if (duration && t) {
                    const p = Math.min(0.9, t / duration);
                    this.log(progress, "Converting", p);
                }
            }

            rs += dt + "\n";
            console.log(dt);
            return true;
        };
        
        if (progress) {
            this.log(progress, "Starting conversion",0.05);
        }

        await Command.run(command.split(" "), logDefault, logDefault);

        if (progress) {
            this.log(progress, "Generating Thumbnails", 0.91);
        }

        const tasks = [this.upload(output)];

        if (thumbnailTimes.length) {
            await this.thumbnails(output.filePath, thumbnailTimes, tasks);
        }

        if (progress) {
            this.log(progress, "Uploading files", 0.91);
        }

        // upload all outputs...
        await Promise.all(tasks);

        if (progress) {
            this.log(progress, "Conversion successful", 1);
        }

        // if it has trigger...
        const trigger: ITrigger = input.trigger;
        if (trigger) {
            const r = await this.trigger(trigger);
            console.log(r);
            rs += r;
        }
        return rs;
    }

    log(trigger: ITriggerObject, status, progress) {
        this.trigger({ ... trigger, body: { status, progress } }).catch((e) => console.error(e));
    }

    async trigger(trigger: ITrigger) {
        let url: string | Request;
        if (typeof trigger === "string") {
            url = trigger;
        }
        if (typeof trigger !== "string") {
            let body = "";
            const headers = trigger.headers ??= {};
            if (typeof trigger.body === "object") {
                body = JSON.stringify(trigger.body);
                headers["content-type"] = "application/json";
            }
            url = new Request(trigger.url, {
                method: trigger.method ?? "POST",
                headers,
                body
            });
        }
        // trigger should be GET
        const fp = typeof url !== "object" ? url : url.url;
        try {
            const rs = await fetch(url);
            if(rs.status <= 300) {
                return `Trigger invoked ${fp} successfully.`;
            }
            throw new Error(`${await rs.text()}`);
        } catch (e) {
            console.error(e);
            return `Trigger invoke ${fp} failed ${e.stack ? e.stack : e}.`;
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

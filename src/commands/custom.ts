import path from "path";
import Command, { asJson } from "../Command";
import TempFileService from "../TempFileService";
import fetch from "node-fetch";
import * as mime from "mime-types";
import { existsSync, readFileSync, promises } from "fs";
import { BlockBlobClient } from "@azure/storage-blob";

interface ICommandInput {
    name: string;
    filePath?: string;
    url?: string;
}

export default class Custom extends Command {

    public async process(input: any): Promise<any> {

        const inputs: ICommandInput[] = [];

        const outputs: ICommandInput[] = [];

        let command = input.command as string;

        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                const element = input[key];
                const filePath = (await TempFileService.getTempFile(path.extname(key))).path;
                if(key.startsWith("output")) {
                    outputs.push({
                        name: key,
                        url: element,
                        filePath
                    })
                    command = command.replace(key, filePath);
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
        const rs = await Command.run(command.split(" "));

        // upload all outputs...
        await Promise.all(outputs.map((x) => this.upload(x)))

        console.log(rs);
        return asJson(rs);
    }
    
    async upload(x: ICommandInput) {
        if (!x.url) {
            return;
        }
        if (!existsSync(x.filePath)) {
            return;
        }
        if (x.url.includes(".blob.core.widows.net")) {
            // use put...
            return this.uploadAzure(x);
        }
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

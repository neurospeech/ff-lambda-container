import path from "path";
import Command, { asJson } from "../Command";
import TempFileService from "../TempFileService";
import fetch from "node-fetch";
import { readFileSync } from "fs";

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
        if (x.url.includes(".blob.core.widows.net")) {
            // use put...
            return this.uploadAzure(x);
        }
    }

    async uploadAzure(x: ICommandInput) {
        const rs = await fetch(x.url, {
            method: "PUT",
            headers: {
                "x-ms-blob-type": "BlockBlob"
            },
            body: readFileSync(x.filePath)
        });
        if (rs.status !== 201) {
            throw new Error(await rs.text());
        }
    }

}

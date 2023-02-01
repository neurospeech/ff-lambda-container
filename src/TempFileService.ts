import { file } from "tmp-promise";
import fetch from "node-fetch";
import * as tmp from "tmp";
import * as url from "url";
import * as path from "path";
import { promises as fsp } from "fs";

tmp.setGracefulCleanup();


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

        console.log(`Downloading ${inputUrl} to ${filePath}`);

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

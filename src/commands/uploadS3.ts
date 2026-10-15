import { readFile } from "fs/promises";
import * as mime from "mime-types";

export default async function uploadS3(url: string, filePath: string) {
    // we will directly upload using FormData..

    const body = new FormData();

    const buffer = await readFile(filePath);

    const type = mime.lookup(filePath);

    body.append("file", new File([buffer], "file", { type }),)

    const r = await fetch(url, {
        method: "POST",
        body,
        headers: {
            "cache-control": "public,max-age=8600000"
        }
    });
    if(r.status > 399) {
        console.error(`Upload failed ${r.status} ${await r.text()}`);
    }
}
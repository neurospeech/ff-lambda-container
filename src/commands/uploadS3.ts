import { readFile } from "fs/promises";
import mime from "mime-types";

export default async function uploadS3(url: string, filePath: string) {
    // we will directly upload using FormData..


    const body = await readFile(filePath);

    const contentType = mime.lookup(filePath);

    const r = await fetch(url, {
        method: "PUT",
        body,
        headers: {
            "cache-control": "public,max-age=31536000",
            "content-type": contentType
        }
    });
    if(r.status > 399) {
        console.error(`Upload failed ${r.status} ${await r.text()}`);
    }
}
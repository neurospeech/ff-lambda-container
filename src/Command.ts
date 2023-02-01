import * as ffmpeg from "fluent-ffmpeg";
import path from "path";

ffmpeg.setFfmpegPath(path.join(__dirname, "..", "ffmpeg"));
ffmpeg.setFfprobePath(path.join(__dirname, "..", "ffmpeg"));

export function asJson(body, statusCode = 200) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    };
}

export default abstract class Command {

    public abstract process(input): Promise<any>;

}
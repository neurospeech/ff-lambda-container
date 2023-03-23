import { spawn } from "child_process";
import * as ffmpeg from "fluent-ffmpeg";
import path from "path";

const ffmpegPath = path.join(__dirname, "..", "ffmpeg", "ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(path.join(__dirname, "..", "ffmpeg", "ffprobe"));

const logDefault = (data: Buffer) => {
    console.log(data.toString("utf8"));
    return true;
}

export default abstract class Command {

    public abstract process(input): Promise<any>;

    /**
     * Runs FFMPEG
     * @param inputArgs args for FFMPeg
     * @param log log Function
     * @param error error logger
     * @returns Promise<string>
     */
    public static run(
        inputArgs: string[],
        log: (text, position) => boolean = logDefault,
        error: (text, position) => boolean = logDefault) {
        return this.exec(ffmpegPath, inputArgs, log, error);
    }

    public static exec(
        filePath: string,
        inputArgs: string[],
        log: (text, position) => boolean = logDefault,
        error: (text, position) => boolean = logDefault) {
        const child = spawn(filePath, inputArgs);
        return new Promise<string>((resolve, reject) => {
            const errors = [];
            const lines = [];
            let logPosition = 0;
            let errorPosition = 0;
            let killed = false;
            child.stderr.on("data", (e) => {
                errors.push(e);
                const ep = errorPosition;
                errorPosition += e.length;
                if (!error) {
                    return;
                }
                if (error(e, ep)) {
                    return;
                }
                killed = true;
                child.kill();
            });
            child.stdout.on("data", (data) => {
                lines.push(data);
                const lp = logPosition;
                logPosition += data.length;
                if (!log) {
                    return;
                }
                if (log(data, lp)) {
                    return;
                }
                killed = true;
                child.kill();
            });
            child.on("error", (er) => {
                if (!killed) {
                    reject(er);
                }
            });
            child.on("close", () => {
                resolve(`${lines.join("\n")}\n${errors.join("\n")}`);
            });
        });
    }

}
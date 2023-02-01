import * as ffmpeg from "fluent-ffmpeg";
import Command, { asJson } from "../Command";
import TempFileService from "../TempFileService";

export default class Mp4Replace extends Command {

    public async process(input: any) {

        const fs = await TempFileService.downloadTo(input.url);
        const rs = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(fs, (error, data) => {
                if (error) {
                    reject(error);
                    reject;
                }
                resolve(data);
            });
        });
        return asJson(rs);
    }

}

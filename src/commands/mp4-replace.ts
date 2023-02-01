import * as ffmpeg from "fluent-ffmpeg";
import Command, { asJson } from "../Command";
import TempFileService from "../TempFileService";

const slow = `-preset slow -codec:a libfdk_aac -b:a 128k -codec:v libx264 -pix_fmt yuv420p -b:v 2500k -minrate 1500k -maxrate 4000k -bufsize 5000k -vf scale=-1:720`;

export default class Mp4Replace extends Command {

    public async process(input: any) {

        const output = await TempFileService.getTempFile(".mp4");

        const video = await TempFileService.downloadTo(input.url);
        const audio = await TempFileService.downloadTo(input.audioUrl);

        const rs = await Command.run(`-i ${video} -i ${audio} ${slow} -map 0:v:0 -map 1:a:0 ${output}`.split(" "));
        console.log(rs);
        return asJson(rs);
    }

}

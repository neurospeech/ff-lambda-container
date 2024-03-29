import * as ffmpeg from "fluent-ffmpeg";
import Command from "../Command";
import TempFileService from "../TempFileService";

export default class FFProbe extends Command {

    public static async probe(url: string , file?: string) {
        try {

            file ??= await TempFileService.downloadTo(url);

            const metadata = await new Promise<any>((resolve, reject) => {
                ffmpeg.ffprobe(file, (error, metadata) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(metadata);
                });
            });

            // probe can stream ...
            // probe is iOS and Android ready ...
            // check for MP4 and AAC
            // check for fast start

            let indexOfMoov = -1;
            let indexOfMDat = -1;

            const checkPosition = (data, length) => {
                let i = data.indexOf("type:'moov'");
                if (i !== -1) {
                    indexOfMoov = length + i;
                }
                i = data.indexOf("type:'mdat'");
                if (i !== -1) {
                    indexOfMDat = length + i;
                }
                return indexOfMoov === -1 || indexOfMDat === -1;
            };

            const text = await Command.run(
                ["-v", "trace",
                "-i",  file,
                "-f",  "null", "-"], null, checkPosition);

            const fastStart = indexOfMoov < indexOfMDat;

            const audioStream = metadata.streams.find((x) => x.codec_type === "audio");
            const videoStream = metadata.streams.find((x) => x.codec_type === "video" && x.codec_name !== "mjpeg");

            const hasAudio = !!audioStream;
            const hasVideo = !!videoStream;

            const isAAC = hasAudio 
                ? metadata.streams.some((x) => x.codec_name === "aac" )
                : true;

            const isH264 = !videoStream  || (videoStream.codec_name === "h264" );

            const videoCodec = videoStream?.codec_type;
            const audioCodec = audioStream?.codec_type;

            let isBelow30FPS = false;
            const avgFrameRate = videoStream?.avg_frame_rate;
            if (avgFrameRate) {
                try {
                isBelow30FPS = eval(avgFrameRate) < 31;
                } catch (e) {

                }
            }

            const lessThan720p = 
                (videoStream?.height && videoStream.height <= 720)
                || (videoStream?.coded_height && videoStream.coded_height <= 720)
                || (videoStream?.width && videoStream.width <= 720)
                || (videoStream?.coded_width && videoStream.coded_width <= 720);

            const isMobileReady = isAAC
                && isH264
                && fastStart
                && isBelow30FPS
                && lessThan720p;

            const needsFastStart = isAAC
                && isH264
                && isBelow30FPS
                && lessThan720p
                && !fastStart;

            return {
                ... metadata,
                lessThan780p: lessThan720p,
                hasAudio,
                hasVideo,
                videoCodec,
                audioCodec,
                isAAC,
                isH264,
                fastStart,
                isBelow30FPS,
                isMobileReady,
                indexOfMoov,
                indexOfMDat,
                needsFastStart
            };
        } catch (e) {
            console.error(e);
            return {
                isAAC: false,
                isH264: false,
                videoCodec: null,
                audioCodec: null,
                hasAudio: false,
                hasVideo: false,
                fastStart: false,
                isBelow30FPS: false,
                isMobileReady: false,
                indexOfMoov: 0,
                indexOfMDat: 0,
                needsFastStart: false,
                error: e
            };
        }
    }

    public async process(input: { url: string }) {

        const rs = await FFProbe.probe(input.url);
        return rs;
    }

}

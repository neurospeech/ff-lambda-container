# FFmpeg AWS Lambda Container

1. This container image will allow you to execute custom commands against ffmpeg.
2. Many encoding API contains too many parameters and various combinations, making it very difficult to customize.
3. Since we an execute custom arguments against ffmpeg, we can practically customize it in any way we want it.

# Installation

1. Create a container based Lambda and choose container created by `Dockerfile` in this project.
2. Allocate maximum memory available, that is 10GB RAM. And use `-threads 10` for optimum performance. If you want to choose lesser memory, use same number of threads as memory. e.g. `-threads 8` for 8GB RAM.
3. Set timeout to 5 minutes, you can set up to 15 minutes as well.
4. In typical `10GB Memory` configuration, 10 minutes of HD 720p video will take up to 3 minutes. This is the sample `https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4` used for testing.

# Usage

Invoke Lambda to execute custom against `ffmpeg`. To execute lambda you have to use `aws sdk` and send following payloads.

# Payload Parameters
```typescript

interface IPayload {
    /**
     * Path of javascript file to execute relative to `/dist` folder.
    */
    rawPath: string;

    body: {
        /** 
         * Command that will be executed against ffmpeg. Please note, all `input*.*` keys specified in body will downloaded locally and
         * the path will be replaced from the command. And after the command is executed, output file will be uploaded to value of key `output.*`.
        */
        command: string;
        /**
         * You can specify multiple keys which starts with `input`. Such as `input0.mp4` or `input1.mp3`.
         * The value must be the url from where the video will be downloaded.
         * 1. Secure URL is preferred. In case of S3 or Blob, you must specify complete signed url.
         * 2. Input file key must have file extension.
        */
        "input*.*": string;

        /** Signed URL of S3 or Blob URI to upload file
         * 1. Output file key must have file extension.
        */
        "output.*": string;

        "thumbnailTimes": IThumbnailTime[];
    }
}

interface IThumbnailTime {
    /** Time at which thumbnail should be taken */
    name: double;
    /** Signed URL of S3 or Blob URI to upload file*/
    url: string;
}

```

# Examples

## Replace Audio

```json
{
  "rawPath": "/custom",
  "body": {
    "input0.mp4": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "input1.mp3": "https://samplemp3.com/download/sample.mp3",
    "output.mp4": "https://blob.core.windows.com/account/container/blob.mp4?signing.....",
    "command": "-i input0.mp4 -i input1.mp3 -preset fast -threads 10 -codec:a aac -b:a 128k -codec:v libx264 -pix_fmt yuv420p -b:v 2500k -minrate 1500k -maxrate 4000k -bufsize 5000k -vf scale=-1:720 -movflags +faststart -map 0:v:0 -map 1:a:0 output.mp4"
  }
}
```

## Convert to WebM

```json
{
  "rawPath": "/custom",
  "body": {
    "input0.mp4": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "output.webm": "https://blob.core.windows.com/account/container/blob.webm?signing.....",
    "command": "-i input0.mp4 -threads 10 libvpx-vp9 -crf 30 -b:v 0 -b:a 128k -c:a libopus output.webm"
  }
}
```

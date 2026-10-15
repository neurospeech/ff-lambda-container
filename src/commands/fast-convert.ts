import Command from "../Command.js";
import FFMpeg from "../lib/FFMpeg.js";

/**
 * This is used for backward compatibility
 */
export default class FastConvert extends Command {

    public process({ input, output: {
        url,
        thumbnails,
        notify = null
    }}) {
        return FFMpeg.fastConvert(input, { url, thumbnails, notify })
    }

} 
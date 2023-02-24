import Command from "../Command";
import FFMpeg from "../lib/FFMpeg";

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
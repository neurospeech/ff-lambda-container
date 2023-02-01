import { file } from "tmp-promise";
import * as tmp from "tmp";

tmp.setGracefulCleanup();


export default class TempFileService {

    public static getTempFile(ext: string = ".tmp") {
        return file({ mode: 0o644, prefix: "tmp-" , postfix: ext});
    }

}

import { asJson } from "./Command";

declare var require;

export default class Commands {

    public static async process(event) {
        try {
            const params = event.queryStringParameters || event.body;
            const rawPath = event.rawPath as string;
            console.log(`path: ${rawPath}`);
            const modulePath = "./commands" + rawPath;
            console.log(`module: ${modulePath}`);
            const { default: module } = require(modulePath);
            return await (new module()).process(params);
        } catch (error) {
            return asJson({
                error,
                event
            }, 500);
        }
    }

}

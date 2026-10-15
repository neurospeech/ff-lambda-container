function asJson(body, statusCode = 200) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    };
}

declare var require;

export default class Commands {

    public static async process(event) {
        try {
            const params = event.queryStringParameters || event.body;
            const rawPath = event.rawPath as string;
            console.log(`path: ${rawPath}`);
            const modulePath = `./commands${rawPath}.js`;
            console.log(`module: ${modulePath}`);
            const { default: module } = await import(modulePath);
            const result = await (new module()).process(params);
            return asJson(result);
        } catch (error) {
            console.error(error.stack ? error.stack : error);
            return asJson({
                error,
                event
            }, 500);
        }
    }

}

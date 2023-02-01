import TempFileService from "./TempFileService";
import { readFileSync, readdirSync } from "fs";
import puppeteer from "puppeteer-core";
import { join } from "path";

// tslint:disable-next-line: max-line-length
const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/70.0.3538.75 Mobile/15E148 Safari/605.1";

const executablePath = (() => {
    const root = join(__dirname, "..", "node_modules", "puppeteer-chromium", "chrome");
    // get first folder...
    const first = readdirSync(root)[0];
    return join(root, first, "chrome-linux", "chrome");
})();

// const executablePath = "/usr/bin/chromium";

const sleep = (n) => new Promise((resolve, reject) => {
    if (typeof n !== "number") {
        n = parseInt(n, 10);
    }
    setTimeout(resolve, (n));
});

const options = [
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-sync',
    '--disk-cache-size=33554432',
    // '--hide-scrollbars',
    // '--ignore-gpu-blacklist',
    // '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain',
    '--single-process',
    // '--enable-logging=stderr',
    // '--v=1',
    // '--disable-gpu',
    //   '--window-size=400,800',
];

const asNumber = (n) => typeof n === "number" ? n : parseInt(n, 10);

const asBoolean = (n) => typeof n === "boolean" ? n : (typeof n === "string" ? /true|yes/i.test(n) : false);

const asJson = (n) => typeof n === "string" ? JSON.parse(n) : null;

interface queryParameters {
    url?: string;
    content?: string;
    timeout?: number | string;
    mobile?: string | boolean;
    height?: number | string;
    width?: number | string;
    deviceScaleFactor?: number | string;
    pdf?: any;
    html?: string | boolean;
    stopTest?: string;
};

const queryParametersTranslator = {
    timeout: asNumber,
    mobile: asBoolean,
    height: asNumber,
    width: asNumber,
    deviceScaleFactor: asNumber,
    html: asBoolean,
    pdf: asJson
};

function format(e: queryParameters) {
    for (const key in queryParametersTranslator) {
        if (Object.prototype.hasOwnProperty.call(queryParametersTranslator, key)) {
            const element = queryParametersTranslator[key];
            const v = e[key];
            if (v !== void 0) {
                e[key] = element(v);
            }
        }
    }
    return e;
};

export default class SaveUrl {

    public static async save(event) {
        try {
            const {
                url,
                content,
                timeout = 15000,
                mobile = true,
                height = mobile ? 800 : 900,
                width = mobile ? 400 : 1024,
                deviceScaleFactor = mobile ? 2: 1,
                pdf = null,
                html = null,
                stopTest = "window.pageReady"
            } = format(event.queryStringParameters ?? {});

            if(!url) {
                throw new Error("No url specified");
            }


            console.log(`Received URL: ${url}`);

            var { page, browser } = await SaveUrl.createPage({
                mobile,
                width,
                height,
                deviceScaleFactor,
                html
            });

            if (url) {
                await page.goto(url, { waitUntil: "networkidle2" });
                console.log(`Url loaded.`);
            } else {
                await page.setContent(content, { waitUntil: "networkidle2"});
                console.log(`Content loaded.`);
            }

            let start = Date.now();
            let end = start + asNumber(timeout);
            for (let index = start; index < end; index+=1000) {
                await sleep(1000);
                if(await page.evaluate(stopTest)) {
                    break;
                }
            }

            if (html) {

                const text = await page.evaluate("window.document.documentElement.outerHTML");
                return {
                    statusCode: 200,
                    headers: {
                        "content-type": "text/html"
                    },
                    body: text
                };
            }

            console.log(`Taking screenshot.`);

            const screen = pdf
                ? await page.pdf(pdf) as Buffer
                : await page.screenshot() as Buffer;

            console.log(`Sending screenshot.`);
            const body = screen.toString("base64");
            await browser.close();

            return {
                statusCode: 200,
                headers: {
                    "content-type": pdf ? "application/pdf" : "image/png"
                },
                body,
                isBase64Encoded: true
            };
        } catch (e) {
            console.error(e);
            return {
                statusCode: 500,
                body: e.stack ?? e.toString()
            }
        }

    }


    private static async createPage({
        mobile,
        width,
        height,
        deviceScaleFactor,
        html
    }) {
        const browser = await puppeteer.launch({
            executablePath,
            userDataDir: "/tmp",
            // dumpio: true,
            args: options
        });

        console.log(`Puppeteer Launched.`);

        let page = await browser.newPage();

        console.log(`New Page created.`);

        if (asBoolean(mobile)) {
            console.log(`User agent set.`);
            page.setUserAgent(userAgent);
        }
        page.setViewport({
            width: asNumber(width),
            height: asNumber(height),
            deviceScaleFactor: asNumber(deviceScaleFactor)
        });
        console.log(`Screen Size set.`);

        // if it is html...
        // disable image/css/font/video...

        if (html) {
            await page.setRequestInterception(true);
            page.on("request", (req) => {
                if(/stylesheet|image|font|media|websocket/.test(req.resourceType())) {
                    req.abort();
                    return;
                }
                req.continue();
            });
        }

        return { page, browser };
    }
}

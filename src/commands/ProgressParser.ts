function parse(line) {
    const d = /Duration:\s+([^,]+)\,\s+start\:/.exec(line);
    const t = /time\=([^\s]+)\s+bitrate\=/.exec(line);
    return [d, t];
}

function parseTime(n) {
    if (!n) {
        return n;
    }
    let [h, m, s] = n.split(":");
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    s = parseFloat(s);
    return s + (m * 60) + (h * 3600);
}

export default class ProgressParser {

    public static parse(line: string) {
        const r = parse(line);
        const [d,t] = r;
        return [parseTime(d?.[1]), parseTime(t?.[1])];
    }
}
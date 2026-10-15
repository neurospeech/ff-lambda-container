import Commands from "./dist/App";

exports.handler = (event, context) => Commands.process(event);
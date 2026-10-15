import Commands from "./dist/App.js";

export const handler = (event, context) => Commands.process(event);
const SaveUrl = require("./dist/App").default;

exports.handler = (event, context) => Commands.process(event);
const SaveUrl = require("./dist/SaveUrl").default;

exports.handler = (event, context) => SaveUrl.save(event);
const SaveUrl = require("./dist/App").default;

SaveUrl.process({
    rawPath: "/probe",
    queryStringParameters: {
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    }
}).catch((error) => console.log(error));
// @ts-check
// Change this import as "const { NavAPI } = require("storysnap");"
const NavAPI = require("../src/navigation-api.js");

NavAPI.launch(undefined).then(() => {
    console.log('Browser started');
    NavAPI
        .navigate('https://www.google.ro/')
        .then(() => NavAPI.takeScreenshot('google.png'))
        .then(() => NavAPI.type('input[type=text]'))
        .then(() => NavAPI.takeScreenshot('google-lucky.png'));
});
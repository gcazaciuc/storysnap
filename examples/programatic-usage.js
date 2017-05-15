// @ts-check
// Change this import as "const { NavAPI } = require("storysnap");"
// const NavAPI = require("../src/navigation-api.js");
module.exports = (NavAPI, options) => NavAPI.launch().then(() => {
    return NavAPI
        .navigate(options.url || 'http://google.ro')
        .then(() => NavAPI.takeScreenshot('google.png'))
        .then(() => NavAPI.type('abc', 'input[type=text]'))
        .then(() => NavAPI.takeScreenshot('google-after-type.png'));
});
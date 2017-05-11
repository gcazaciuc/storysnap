const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');
let launcher = null;
function launchChrome(url, headless = true) {
  const launchOptions = {
    port: 9222,
    autoSelectChrome: true, // False to manually select which Chrome install.
    additionalFlags: [
      '--window-size=1024,732',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      headless ? '--headless' : ''
    ]
  };
  if (url) {
    launchOptions.startingUrl = url;
  }
  launcher = new ChromeLauncher(launchOptions);
  // Also make sure that we wait a little before
  // deciding that we are all good launching
  return launcher.run().then(() => {
      return new Promise((resolve) => setTimeout(() => resolve(launcher), 1000));
  })
    .catch(err => {
      return launcher.kill().then(() => { // Kill Chrome if there's an error.
        throw err;
      }, console.error);
    });
}

function kill() {
    return launcher.kill();
}

module.exports = {
    launchChrome,
    kill
};

const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');
let launcher = null;
function launchChrome(url, headless = true) {
  launcher = new ChromeLauncher({
    port: 9222,
    startingUrl: url || '',
    autoSelectChrome: true, // False to manually select which Chrome install.
    additionalFlags: [
      '--window-size=1024,732',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-web-security',
      headless ? '--headless' : ''
    ]
  });
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

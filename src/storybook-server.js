/*
 *   Credits for the implementation go to https://github.com/tsuyoshiwada/storybook-chrome-screenshot/blob/0729bdd2010a2d55777a32e1a68cacb96514b643/src/internal/server.js
 *   The implementation below contains just small changes from the original implementation.   
 */
const { spawn } = require('child_process');
const logger = require('./logger');

class StorybookServer {
    constructor(server, url) {
        this.server = server;
        this.url = url;
    }

    getURL() {
        return this.url;
    }

    kill() {
        this.server.kill();
    }
}


const optionsToCommandArgs = (options) => {
    const args = [
        '-p', options.port,
        '-c', options.configDir,
    ];

    if (options.host) {
        args.push('-h', options.host);
    }

    if (options.staticDir) {
        args.push('-s', options.staticDir);
    }

    return args;
};

const startStorybookServer = (options) => new Promise((resolve, reject) => {
    const { cmd, cwd } = options;
    const args = optionsToCommandArgs(options);
    console.log(`Launching a new Storybook instance...`);
    const storybook = spawn(cmd, args, { cwd });
    storybook.stdout.on('data', (out) => {
        const str = out.toString().trim();
        const m = str.match(/^Storybook started on => (https?:\/\/.+)$/);

        if (m) {
            const s = new StorybookServer(storybook, m[1]);
            resolve(s);
        }
    });

    storybook.stderr.on('data', (out) => {
        logger.info(out.toString());
    });

    storybook.on('error', (err) => {
        logger.error(err.toString());
        reject(err.toString());
    });
});


module.exports = startStorybookServer;
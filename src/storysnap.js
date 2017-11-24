const fs = require('fs');
const path = require('path');
const getPort = require('get-port')
const { execSync } = require('child_process');
const storyScraper = require('../src/story-scraper.js');
const startStorybookServer = require('../src/storybook-server.js');
const logSymbols = require('log-symbols');
const logger = require('./logger');

module.exports = async (options) => {
    const bin = options.bin || execSync('echo $(npm bin)', { encoding: 'utf-8' }).trim();
    if (options.autostart) {
        options.port = await getPort({ port: options.port });
        const storybookOptions = {
            port: options.port,
            configDir: options.configDir,
            cmd: path.resolve(bin, 'start-storybook')
        };
        await startStorybookServer(storybookOptions);
    }
    const storybookUrl = `http://${options.host}:${options.port}`;
    await storyScraper.run(Object.assign(
        {}, 
        options, {
            storybookUrl
        })
    );
    logger.info(`${logSymbols.success} Done capturing ${storyScraper.getCapturedScreenshots()} screenshots.`, 'green');
    await storyScraper.terminate();
};

function handleExit(err) {
    storyScraper.terminate();
    if(err) {
        console.log(err);
    }
}

process.on('uncaughtException', handleExit);
process.on('beforeExit', handleExit);
process.on('unhandledRejection', handleExit);
process.on('SIGINT', handleExit);
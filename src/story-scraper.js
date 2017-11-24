const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const puppeteer = require('puppeteer');
const workerFarm = require('worker-farm');
const ProgressBar = require('progress');
const chalk = require('chalk');
const emoji = require('node-emoji');
const logger = require('./logger');
const getNames = (storiesEl) => storiesEl.map((el) => el.getAttribute('data-name'));
let workers = null;
let progress = null;
let capturedScreenshots = 0;

const sendToWorker = (kind, options) => {
    return new Promise((resolve, reject) => {
        const workerPayload = { 
            kind, 
            storybookUrl: options.storybookUrl, 
            screenshotDir: options.output 
        };
        workers(workerPayload, (err, output) => {
            progress.tick();
            capturedScreenshots += output.capturedScreenshots;
            if (err) {
                logger.error(`Error encountered while screenshoting kinds!`);
                reject(err);
                return;
            }
            resolve(output);
        });
    });
}

const run = async (options) => {
  logger.clear();
  const browser = await puppeteer.launch({ headless: true });
  if (fs.existsSync(options.output)) {
      rimraf.sync(options.output);
  }
  mkdirp.sync(options.output);
  logger.info(`Connecting to Storybook server(${chalk.green(options.storybookUrl)}).`, 'yellow')
  const page = await browser.newPage();
  await page.goto(options.storybookUrl);
  const kinds = await page.$$eval('div[data-name]', getNames);
  await browser.close();
  const workerOptions = {
        maxConcurrentCallsPerWorker: 1
  };
  if (options.concurrency) {
      workerOptions.maxConcurrentWorkers = options.concurrency;
  }
  workers = workerFarm(workerOptions, require.resolve('./story-worker'));
  capturedScreenshots = 0;
  progress = new ProgressBar(emoji.emojify(':camera:  [:bar] :percent'), { 
      total: kinds.length 
  });
  logger.info(`Taking screenshots of stories...`, 'yellow');
  progress.tick();
  await Promise.all(
    kinds.map((k) => sendToWorker(k, options))
  );
};

module.exports = {
    run,
    terminate: () => {
        workerFarm.end(workers);
    },
    getCapturedScreenshots: () => capturedScreenshots
};